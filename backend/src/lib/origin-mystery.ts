import {randomUUID,randomBytes} from 'node:crypto';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {OriginError} from './origin-ai';
import {publicCatalog} from './origin-public-catalog';
import {MYSTERY_HANDLE,selectSamples,type SampleCoffee} from './origin-mystery-core';
const dbOf=(scope:any)=>scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
export async function samplePool(scope:any):Promise<SampleCoffee[]>{
 const {data}=await scope.resolve(ContainerRegistrationKeys.QUERY).graph({entity:'product',fields:['id','handle','title','description','metadata','variants.id','variants.title','variants.sku','variants.weight','variants.metadata','variants.price_set.prices.*','variants.inventory_items.required_quantity','variants.inventory_items.inventory.location_levels.*'],filters:{status:'published'},pagination:{take:100}});
 return poolFromProducts(data);
}
export function poolFromProducts(data:any[]):SampleCoffee[]{
 return data.filter(p=>!p.metadata?.product_type&&p.metadata?.tip_cafea!=='Accesoriu').flatMap(p=>{
  const v=p.variants?.find((v:any)=>v.metadata?.origin_mystery_sample===true);if(!v)return [];
  const stock=(item:any)=>Math.min(...(item.inventory_items||[]).map((i:any)=>Math.floor((i.inventory?.location_levels||[]).reduce((n:number,l:any)=>n+Math.max(0,Number(l.stocked_quantity)-Number(l.reserved_quantity)),0)/(i.required_quantity||1))),0x7fffffff);
  const snapshot=publicCatalog([{id:p.handle,name:p.title,description:p.description,metadata:p.metadata,variants:p.variants.filter((x:any)=>[250,1000].includes(Number(x.weight))).flatMap((x:any)=>{const price=x.price_set?.prices?.find((z:any)=>z.currency_code==='ron'&&!z.price_list_id);return price?[{id:x.id,weight:Number(x.weight),price:Number(price.amount),stock:stock(x)}]:[]})}])[0];
  return [{handle:p.handle,variantId:v.id,stock:v.inventory_items?.length?stock(v):0,snapshot}];
 });
}
export async function planSamples(scope:any,quantity:number){
 try{return selectSamples(await samplePool(scope),quantity);}catch{throw new OriginError(409,'samples_unavailable','Nu mai sunt suficiente mostre din trei cafele distincte. Redu cantitatea sau revino mai târziu.');}
}
export function sampleLines(plan:any[]){return plan.map(s=>({variant_id:s.coffee.variantId,quantity:1,unit_price:0,metadata:{origin_mystery_component:true,mystery_set:s.setIndex,mystery_slot:s.slot}}));}
export async function saveSamplePlan(trx:any,cartId:string,customerId:string,plan:any[]){
 if(plan.length)await trx('origin_mystery_samples').insert(plan.map(s=>({id:randomUUID(),cart_id:cartId,customer_id:customerId,set_index:s.setIndex,slot:s.slot,coffee_handle:s.coffee.handle,variant_id:s.coffee.variantId,code:s.code,snapshot:JSON.stringify(s.coffee.snapshot)})));
}
export async function finalizeSamples(scope:any,customerId:string,orderId:string){
 const db=dbOf(scope),checkout=await db('origin_checkouts').where({order_id:orderId,customer_id:customerId}).first();if(!checkout)return;
 await db.transaction(async(trx:any)=>{
  const rows=await trx('origin_mystery_samples').where({cart_id:checkout.cart_id,customer_id:customerId}).forUpdate();if(!rows.length)return;
  await trx('origin_mystery_samples').where({cart_id:checkout.cart_id}).update({order_id:orderId});
  const {data}=await scope.resolve(ContainerRegistrationKeys.QUERY).graph({entity:'order',fields:['id','email','display_id','status'],filters:{id:orderId,customer_id:customerId}});
  if(!data[0]||data[0].status==='canceled')return;
  await trx('origin_mail_outbox').insert({id:randomUUID(),order_id:orderId,recipient:data[0].email,subject:`ORIGIN — codurile mostrelor din comanda #${data[0].display_id}`,status:'pending'}).onConflict('order_id').ignore();
 });
}
export async function validateMysteryCart(scope:any,cart:any){
 const db=dbOf(scope);if(!await db.schema.hasTable('origin_mystery_settings'))return;
 const settings=await db('origin_mystery_settings').where({id:'bundle'}).first();if(!settings)return;
 const parents=(cart.items||[]).filter((i:any)=>i.variant_id===settings.variant_id);
 const components=(cart.items||[]).filter((i:any)=>i.metadata?.origin_mystery_component);
 if(!parents.length&&!components.length)return;
 const checkout=await db('origin_checkouts').where({cart_id:cart.id,customer_id:cart.customer_id}).first();
 const expected=await db('origin_mystery_samples').where({cart_id:cart.id,customer_id:cart.customer_id});
 const quantity=parents.reduce((n:number,i:any)=>n+Number(i.quantity),0);
 if(!checkout||!quantity||quantity*3!==expected.length||components.length!==expected.length)throw Error('Mystery set composition changed.');
 for(const s of expected){const matches=components.filter((i:any)=>i.variant_id===s.variant_id&&Number(i.metadata.mystery_set)===s.set_index&&Number(i.metadata.mystery_slot)===s.slot&&Number(i.quantity)===1&&Number(i.unit_price)===0);if(matches.length!==1)throw Error('Mystery sample composition changed.');}
}
export async function customerSamples(scope:any,customerId:string,orderId?:string){
 const db=dbOf(scope);const query=db('origin_mystery_samples as s').join('origin_checkouts as c','c.order_id','s.order_id').where('s.customer_id',customerId).whereNotNull('s.order_id');
 if(orderId)query.where('s.order_id',orderId);
 const rows=await query.select('s.*').orderBy('s.created_at','desc').limit(150);
 const orders=[...new Set(rows.map((r:any)=>r.order_id))];const emails=orders.length?await db('origin_mail_outbox').whereIn('order_id',orders):[];
 return {samples:rows.map((s:any)=>({code:s.code,orderId:s.order_id,setIndex:s.set_index,slot:s.slot,note:s.note||'',revealed:!!s.revealed_at,coffee:s.revealed_at?s.snapshot:undefined})),mail:emails.map((m:any)=>({orderId:m.order_id,status:m.status==='sent'?'sent':'pending',sentAt:m.sent_at||null}))};
}
export async function revealSample(scope:any,customerId:string,raw:any){
 const code=typeof raw?.code==='string'?raw.code.trim().toUpperCase():'',note=typeof raw?.note==='string'?raw.note.trim():'';
 if(!/^MS-[0-9A-F]{18}$/.test(code)||!note||note.length>600)throw new OriginError(400,'invalid_sample','Introdu codul mostrei și o impresie de cel mult 600 de caractere.');
 const db=dbOf(scope),sample=await db('origin_mystery_samples').where({code,customer_id:customerId}).whereNotNull('order_id').first();
 if(!sample)throw new OriginError(404,'sample_not_found','Codul nu aparține unei mostre din comenzile contului tău.');
 const {data}=await scope.resolve(ContainerRegistrationKeys.QUERY).graph({entity:'order',fields:['id','status'],filters:{id:sample.order_id,customer_id:customerId}});
 if(!data[0]||data[0].status==='canceled')throw new OriginError(409,'sample_order_canceled','Mostra nu poate fi dezvăluită pentru o comandă anulată.');
 await db('origin_mystery_samples').where({id:sample.id}).update({note,revealed_at:sample.revealed_at||new Date()});
 const identity=await db('origin_coffee_codes').where({coffee_handle:sample.coffee_handle}).first();
 return {coffee:sample.snapshot,coffeeCode:identity?.code,note};
}
export async function ensureCoffeeCode(db:any,handle:string){await db('origin_coffee_codes').insert({coffee_handle:handle,code:'CF-'+randomBytes(6).toString('hex').toUpperCase()}).onConflict('coffee_handle').ignore();}
export {MYSTERY_HANDLE};
