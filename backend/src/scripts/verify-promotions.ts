import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
import {cancelOrderWorkflow} from '@medusajs/core-flows';
import {setupPromotions,changePromotion,promotionCart,ensureTastingReward,validatePromotions} from '../lib/origin-promotions';
import {createCheckout,changeShipping,getCheckout,preparePayment,finishCheckout} from '../lib/origin-checkout';
import {catalog} from '../lib/origin-store';
import '../workflows/hooks/origin-promotions';
import '../workflows/hooks/origin-checkout-validation';
export default async function verify({container}:ExecArgs){
 if(process.env.ORIGIN_VERIFY_PROMOTIONS!=='local-only'||!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL||'http://invalid').hostname))throw Error('Run only against the local development database with ORIGIN_VERIFY_PROMOTIONS=local-only.');
 await setupPromotions(container);
 const db:any=container.resolve(ContainerRegistrationKeys.PG_CONNECTION),query=container.resolve(ContainerRegistrationKeys.QUERY);
 const customer=await container.resolve(Modules.CUSTOMER).createCustomers({email:`promotions-${randomUUID()}@exemplu.test`,has_account:false});
 const req:any={scope:container,body:{},headers:{},query:{}},orders:string[]=[];
 const address={firstName:'Test',lastName:'Promotii',address:'Strada Testului 1',city:'București',county:'București',postalCode:'010101',phone:'0700000000'};
 const products:any[]=await catalog(container),coffee=products.find(p=>p.id==='ethiopia-guji')||products.find(p=>p.variants.some((v:any)=>v.weight===250&&v.stock>=4));
 const price=coffee.variants.find((v:any)=>v.weight===250).price;
 async function cart(quantity:number,product=coffee,weight=250){req.body={requestId:randomUUID(),address,email:customer.email,items:[{coffeeId:product.id,weight,grind:weight?'Boabe':'Nu se aplică',quantity}]};return createCheckout(req,{...customer,guest:true});}
 async function apply(id:string,code:string){req.body={code};await changePromotion(req,customer.id,id);return getCheckout(req,customer.id,id);}
 async function ship(c:any,express=false){const option=c.shippingOptions.find((s:any)=>express?s.name.includes('express'):s.name.includes('standard'));assert.ok(option);req.body={optionId:option.id};return changeShipping(req,customer.id,c.id);}
 try{
  let c:any=await cart(3);c=await ship(c);assert.equal(c.shipping,0);assert.equal(c.total,price*3);
  c=await apply(c.id,'PRIMAORIGINE');assert.equal(c.discount,price*3*.1);assert.equal(c.shipping,price*3*.9>=180?0:10);
  c=await apply(c.id,'');assert.equal(c.discount,0);assert.equal(c.shipping,0);
  c=await ship(c,true);assert.ok(c.shipping>0);assert.equal(c.discount,0);
  c=await cart(1);await assert.rejects(()=>apply(c.id,'PRIMAORIGINE'),/prima comandă/);
  await assert.rejects(()=>apply(c.id,'NECUNOSCUT'),/Codul/);
  c=await cart(2);c=await apply(c.id,' primaorigine ');c=await ship(c);assert.equal(c.discount,price*2*.1);assert.equal(c.total,price*2*.9+10);
  req.body={method:'cash'};await preparePayment(req,customer,c.id);
  await assert.rejects(()=>apply(c.id,''),/înainte de/);
  const order:any=await finishCheckout(req,customer.id,c.id);orders.push(order.id);assert.equal(order.discount,price*2*.1);assert.equal(order.total,price*2*.9+10);
  const reuse:any=await cart(2);await assert.rejects(()=>apply(reuse.id,'PRIMAORIGINE'),/prima comandă/);
  // A second guest identity cannot reuse the offer with the same e-mail.
  const second=await container.resolve(Modules.CUSTOMER).createCustomers({has_account:false});
  req.body={requestId:randomUUID(),address,email:customer.email.toUpperCase(),items:[{coffeeId:coffee.id,weight:250,grind:'Boabe',quantity:2}]};
  const secondCart=await createCheckout(req,{...second,guest:true});req.body={code:'PRIMAORIGINE'};
  await assert.rejects(()=>changePromotion(req,second.id,secondCart.id),/prima comandă/);
  // Source reward is tested using a real locally paid manual-provider order.
  const bundle=products.find(p=>p.metadata?.product_type==='tasting_set');assert.ok(bundle);
  let mystery:any=await cart(1,bundle,0);mystery=await ship(mystery);req.body={method:'cash'};await preparePayment(req,customer,mystery.id);
  const source:any=await finishCheckout(req,customer.id,mystery.id);orders.push(source.id);
  assert.equal(await ensureTastingReward(container,source.id),null,'unpaid cash order must not issue reward');
  const {data:native}=await query.graph({entity:'order',fields:['id','payment_collections.payments.id'],filters:{id:source.id}});
  const payment=native[0].payment_collections!.flatMap((p:any)=>p.payments)[0];assert.ok(payment);
  await container.resolve(Modules.PAYMENT).capturePayment({payment_id:payment.id});
  const reward=await ensureTastingReward(container,source.id);assert.ok(reward?.code);assert.equal((await ensureTastingReward(container,source.id))!.code,reward.code);
  const {data:variant}=await query.graph({entity:'product_variant',fields:['id','product.handle'],filters:{id:reward.variant_ids[0]}});
  const eligible=products.find(p=>p.id===variant[0].product!.handle);assert.ok(eligible);
  let target:any=await cart(2,eligible);target=await apply(target.id,reward.code);
  const eligiblePrice=eligible.variants.find((v:any)=>v.weight===250).price;assert.equal(target.discount,Math.round(eligiblePrice*15)/100,'one unit across the whole cart');
  const outsider=products.find(p=>p.variants?.some((v:any)=>v.weight===250&&v.stock>=1&&!reward.variant_ids.includes(v.id)));
  if(outsider){const wrong=await cart(1,outsider);await assert.rejects(()=>apply(wrong.id,reward.code),/250 g/);}
  req.body={requestId:randomUUID(),address,email:`other-${randomUUID()}@exemplu.test`,items:[{coffeeId:eligible.id,weight:250,grind:'Boabe',quantity:1}]};
  const otherCart=await createCheckout(req,{...second,guest:true});req.body={code:reward.code};await assert.rejects(()=>changePromotion(req,second.id,otherCart.id),/e-mail/);
  await db('origin_tasting_rewards').where({order_id:source.id}).update({expires_at:new Date(Date.now()-1000)});
  await assert.rejects(async()=>validatePromotions(container,await promotionCart(container,target.id)),/expirat/);
  await db('origin_tasting_rewards').where({order_id:source.id}).update({expires_at:reward.expires_at});
  target=await ship(target);req.body={method:'cash'};await preparePayment(req,customer,target.id);
  const redeemed:any=await finishCheckout(req,customer.id,target.id);orders.push(redeemed.id);assert.equal(redeemed.discount,Math.round(eligiblePrice*15)/100);
  const reused=await cart(1,eligible);await assert.rejects(()=>apply(reused.id,reward.code),/deja folosit/);
  console.log('PROMOTIONS_VERIFIED: thresholds, standard/express, apply/remove, native totals, checkout freeze, first-order/account/email reuse, paid-source reward, idempotence, one-unit discount, wrong coffee/email and expiry.');
 }finally{
  for(const id of orders)await cancelOrderWorkflow(container).run({input:{order_id:id}});
  console.log('PROMOTIONS_CLEANUP: local test orders canceled; only reserved .test email addresses used.');
 }
}
