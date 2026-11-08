import {guestCheckoutCustomer} from './origin-guest-checkout';
import {queueOrderConfirmation} from './origin-order-mail';
import {isMystery} from './origin-mystery-core';
import {planSamples,sampleLines,saveSamplePlan,finalizeSamples} from './origin-mystery';
import {deliverSampleMail} from './origin-mail';
import {createHash} from 'node:crypto';
import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
import {createCartWorkflow,addShippingMethodToCartWorkflow,listShippingOptionsForCartWithPricingWorkflow,createPaymentCollectionForCartWorkflow,createPaymentSessionsWorkflow,completeCartWorkflow} from '@medusajs/core-flows';
import {currentCustomer} from './origin-accounts';
import {catalog,allowOrigin,fail} from './origin-store';
import {OriginError} from './origin-ai';
import {paymentConfig} from './origin-payments-config';

const error=(status:number,code:string,message:string)=>new OriginError(status,code,message);
const dbOf=(req:any)=>req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
const queryOf=(req:any)=>req.scope.resolve(ContainerRegistrationKeys.QUERY);
const grinds=['Boabe','Măcinată pentru V60','Măcinată pentru espresso','Măcinată pentru Moka','Măcinată pentru AeroPress','Măcinată pentru French Press','Măcinată pentru ibric'];
const attempts=new Map<string,{count:number,until:number}>();
export async function checkoutCustomer(req:any,res:any,mutate=false){
 allowOrigin(req);res.setHeader('Cache-Control','no-store');
 const customer:any=await currentCustomer(req,res)||await guestCheckoutCustomer(req,res);

 if(mutate){const now=Date.now();let item=attempts.get(customer.guest?'guest:'+req.socket?.remoteAddress:customer.id);if(!item||item.until<now){item={count:0,until:now+600000};attempts.set(customer.guest?'guest:'+req.socket?.remoteAddress:customer.id,item);}if(++item.count>60)throw error(429,'checkout_limit','Prea multe încercări. Revino peste câteva minute.');if(attempts.size>1000)for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);}
 return customer;
}
export function checkoutFail(res:any,e:any){
 if(e instanceof OriginError)return fail(res,e);
 const text=String(e?.message||'');
 if(/inventory|stock|required quantity/i.test(text))return fail(res,error(409,'stock_changed','Stocul s-a modificat. Verifică produsele din coș și încearcă din nou.'));
 if(/payment|stripe|authorize/i.test(text))return fail(res,error(409,'payment_pending','Plata nu este confirmată sau necesită o nouă încercare. Nu retrimite plata dacă a fost deja confirmată; reîncearcă verificarea comenzii.'));
 return fail(res,e);
}
function textField(value:any,label:string,max=100,min=1){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max||/[\x00-\x1f]/.test(value))throw error(400,'invalid_address',`Completează corect câmpul „${label}”.`);return value.trim();}
export function cleanAddress(raw:any){
 const address={first_name:textField(raw?.firstName,'Prenume',80),last_name:textField(raw?.lastName,'Nume',80),address_1:textField(raw?.address,'Adresă',180,5),address_2:raw?.details?textField(raw.details,'Detalii adresă',100):'',city:textField(raw?.city,'Localitate',80),province:textField(raw?.county,'Județ',80),postal_code:textField(raw?.postalCode,'Cod poștal',6,6),phone:textField(raw?.phone,'Telefon',22,9),country_code:'ro'};
 if(!/^\d{6}$/.test(address.postal_code)||!/^\+?[\d ()-]{9,22}$/.test(address.phone))throw error(400,'invalid_address','Folosește un cod poștal de 6 cifre și un număr de telefon valid.');
 return address;
}
export async function checkoutOptions(req:any){
 const {data:regions}=await queryOf(req).graph({entity:'region',fields:['id','currency_code','countries.iso_2','payment_providers.id','payment_providers.is_enabled'],filters:{currency_code:'ron'}});
 const region=regions.find((r:any)=>r.countries?.some((c:any)=>c.iso_2==='ro'));
 if(!region)throw error(503,'region_missing','Livrarea în România nu este configurată.');
 const cfg=paymentConfig(),stripe=cfg.configured&&region.payment_providers?.some((p:any)=>p.id==='pp_stripe_stripe');
 return {regionId:region.id,currency:'ron',country:'ro',testMode:true,stripeAvailable:!!stripe,publicKey:stripe?cfg.publicKey:null,webhookConfigured:!!cfg.webhookSecret};
}
async function ownedRow(req:any,customerId:string,id:string){
 if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(id))throw error(404,'checkout_not_found','Checkout-ul nu există.');
 const row=await dbOf(req)('origin_checkouts').where({cart_id:id,customer_id:customerId}).first();
 if(!row)throw error(404,'checkout_not_found','Checkout-ul nu există.');return row;
}
const cartFields=['id','customer_id','email','completed_at','currency_code','total','original_item_subtotal','original_shipping_subtotal','tax_total','discount_subtotal','metadata','shipping_address.*','items.id','items.title','items.product_title','items.variant_title','items.variant_id','items.quantity','items.original_subtotal','items.metadata','shipping_methods.id','shipping_methods.name','shipping_methods.shipping_option_id','shipping_methods.amount','payment_collection.id','payment_collection.status','payment_collection.payment_sessions.id','payment_collection.payment_sessions.provider_id','payment_collection.payment_sessions.status','payment_collection.payment_sessions.data'];
async function nativeCart(req:any,id:string){const {data}=await queryOf(req).graph({entity:'cart',fields:cartFields,filters:{id}});if(!data[0])throw error(404,'checkout_not_found','Checkout-ul nu există.');return data[0];}
function itemsView(items:any[]){return (items||[]).filter(i=>!i.metadata?.origin_mystery_component).map(i=>({id:i.id,coffeeId:i.metadata?.coffee_id||null,title:i.product_title||i.title,variant:i.variant_title,quantity:Number(i.quantity),unitPrice:Number(i.original_subtotal)/Number(i.quantity),total:Number(i.original_subtotal),grind:i.metadata?.grind||'Boabe',mystery:i.metadata?.origin_mystery_set===true,weight:Number(i.metadata?.weight)||null}));}
async function viewCart(req:any,row:any){
 const c=await nativeCart(req,row.cart_id);
 const {result:shipping}=await listShippingOptionsForCartWithPricingWorkflow(req.scope).run({input:{cart_id:c.id}});
 const active=c.payment_collection?.payment_sessions?.find((p:any)=>p.provider_id===(row.payment_method==='stripe'?'pp_stripe_stripe':'pp_system_default')&&!['canceled','error'].includes(p.status));
 return {id:c.id,orderId:row.order_id||null,completed:!!c.completed_at,currency:c.currency_code,email:c.email,address:c.shipping_address,items:itemsView(c.items),subtotal:Number(c.original_item_subtotal),shipping:Number(c.original_shipping_subtotal),tax:Number(c.tax_total),discount:Number(c.discount_subtotal),total:Number(c.total),shippingOptionId:c.shipping_methods?.[0]?.shipping_option_id||null,shippingOptions:shipping.filter((s:any)=>Number.isFinite(Number(s.amount))).map((s:any)=>({id:s.id,name:s.type?.code==='express'?'Curier express':'Curier standard',description:s.type?.code==='express'?'Estimativ 1–2 zile lucrătoare':'Estimativ 2–3 zile lucrătoare',amount:Number(s.amount)})),paymentMethod:row.payment_method||null,clientSecret:row.payment_method==='stripe'?active?.data?.client_secret||null:null};
}
export async function createCheckout(req:any,customer:any){
 const {requestId,items}=req.body||{};
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{16,90}$/.test(requestId))throw error(400,'invalid_request_id','Reîncarcă pagina înainte de checkout.');
 const address=cleanAddress(req.body.address);
 const email=customer.guest?(typeof req.body.email==='string'?req.body.email.trim().toLowerCase():''):customer.email;
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw error(400,'invalid_email','Introdu o adresă de e-mail validă pentru confirmarea comenzii.');
 if(!Array.isArray(items)||!items.length||items.length>30)throw error(400,'invalid_items','Coșul trebuie să conțină între 1 și 30 de poziții.');
 const products=await catalog(req.scope),totals=new Map<string,number>();let insufficient='';
 const lines=items.map((item:any)=>{
  const p=products.find((p:any)=>p.id===item.coffeeId),v=p?.variants.find((v:any)=>v.weight===item.weight);
  if(!v||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20||!(['accessory','tasting_set'].includes(p.metadata?.product_type)?item.weight===0&&item.grind==='Nu se aplică':grinds.includes(item.grind)))throw error(400,'invalid_items','Un produs sau o opțiune de cumpărare nu este validă.');
  const total=(totals.get(v.id)||0)+item.quantity;totals.set(v.id,total);
  if(total>v.stock)insufficient=`Stoc insuficient pentru ${p.name}, ${['accessory','tasting_set'].includes(p.metadata?.product_type)?(p.metadata.unitate||'1 bucată'):v.weight+' g'}.`;
  return {variant_id:v.id,quantity:item.quantity,metadata:{coffee_id:p.id,grind:item.grind,weight:v.weight,origin_mystery_set:isMystery(p),demo:true}};
 });
 const cfg=await checkoutOptions(req),id=createHash('sha256').update(customer.id+':'+requestId).digest('hex');
 const fingerprint=createHash('sha256').update(JSON.stringify({lines,address,email})).digest('hex'),db=dbOf(req);
 await db('origin_checkouts').insert({id,customer_id:customer.id,fingerprint}).onConflict('id').ignore();
 const row=await db.transaction(async(trx:any)=>{
  const r=await trx('origin_checkouts').where({id,customer_id:customer.id}).forUpdate().first();
  if(!r||r.fingerprint!==fingerprint)throw error(409,'request_changed','Datele s-au schimbat. Începe un checkout nou.');
  if(r.cart_id)return r;
  if(insufficient)throw error(409,'stock_changed',insufficient);
  const sampleQuantity=lines.filter((l:any)=>l.metadata.origin_mystery_set).reduce((n:number,l:any)=>n+l.quantity,0);
  if(sampleQuantity>5)throw error(400,'too_many_sets','Poți comanda maximum cinci seturi de mostre odată.');
  const plan=sampleQuantity?await planSamples(req.scope,sampleQuantity):[];
  const {result:c}=await createCartWorkflow(req.scope).run({input:{region_id:cfg.regionId,customer_id:customer.id,...(!customer.guest?{email}:{}),currency_code:'ron',shipping_address:address,billing_address:address,items:[...lines,...sampleLines(plan)],metadata:{origin_demo:true,origin_checkout:true}}});
  if(customer.guest)await req.scope.resolve(Modules.CART).updateCarts(c.id,{email});
  await saveSamplePlan(trx,c.id,customer.id,plan);
  await trx('origin_checkouts').where({id}).update({cart_id:c.id});return {...r,cart_id:c.id};
 });
 return viewCart(req,row);
}
export async function getCheckout(req:any,customerId:string,id:string){return viewCart(req,await ownedRow(req,customerId,id));}
export async function activeCheckout(req:any,customerId:string){const row=await dbOf(req)('origin_checkouts').where({customer_id:customerId}).whereNull('order_id').whereNotNull('cart_id').orderBy('created_at','desc').first();return row?viewCart(req,row):null;}
export async function changeShipping(req:any,customerId:string,id:string){
 await ownedRow(req,customerId,id);
 return dbOf(req).transaction(async(trx:any)=>{
  const row=await trx('origin_checkouts').where({cart_id:id,customer_id:customerId}).forUpdate().first();
  if(row.payment_method||row.order_id)throw error(409,'checkout_locked','Livrarea este deja confirmată. Reia checkout-ul pentru alte date.');
  const {result:options}=await listShippingOptionsForCartWithPricingWorkflow(req.scope).run({input:{cart_id:id}});
  if(!options.some((o:any)=>o.id===req.body?.optionId))throw error(400,'invalid_shipping','Alege o opțiune de livrare disponibilă.');
  await addShippingMethodToCartWorkflow(req.scope).run({input:{cart_id:id,options:[{id:req.body.optionId}]}});
  return viewCart(req,row);
 });
}
export async function preparePayment(req:any,customer:any,id:string){
 await ownedRow(req,customer.id,id);
 const method=req.body?.method;
 if(!['cash','stripe'].includes(method))throw error(400,'invalid_payment','Alege o metodă de plată validă.');
 if(method==='stripe'&&!(await checkoutOptions(req)).stripeAvailable)throw error(503,'stripe_not_configured','Plata cu cardul nu este disponibilă momentan. Alege ramburs sau revino mai târziu.');
 return dbOf(req).transaction(async(trx:any)=>{
  const row=await trx('origin_checkouts').where({cart_id:id,customer_id:customer.id}).forUpdate().first();
  if(row.order_id)return viewCart(req,row);
  if(row.payment_method&&row.payment_method!==method)throw error(409,'checkout_locked','Metoda a fost confirmată. Reia checkout-ul pentru altă metodă de plată.');
  let cart=await nativeCart(req,id);
  if(!cart.shipping_methods?.length)throw error(400,'shipping_required','Alege livrarea înainte de plată.');
  if(!cart.payment_collection?.id){await createPaymentCollectionForCartWorkflow(req.scope).run({input:{cart_id:id}});cart=await nativeCart(req,id);}
  // Freeze shipping before creating the provider session, so its amount cannot go stale.
  if(row.expected_total!==null&&row.expected_total!==undefined&&Math.round(Number(row.expected_total)*100)!==Math.round(Number(cart.total)*100))throw error(409,'checkout_changed','Totalul s-a modificat. Reia checkout-ul înainte de plată.');
  await trx('origin_checkouts').where({id:row.id}).update({payment_method:method,expected_total:Number(cart.total)});
  const provider=method==='stripe'?'pp_stripe_stripe':'pp_system_default';
  if(!cart.payment_collection.payment_sessions?.some((p:any)=>p.provider_id===provider&&!['error','canceled'].includes(p.status)))await createPaymentSessionsWorkflow(req.scope).run({input:{payment_collection_id:cart.payment_collection.id,provider_id:provider,customer_id:customer.id,data:method==='stripe'?{metadata:{origin_demo:'true'},payment_method_types:['card']}: {}}});
  return viewCart(req,{...row,payment_method:method});
 });
}
export async function finishCheckout(req:any,customerId:string,id:string){
 await ownedRow(req,customerId,id);
 const orderId=await dbOf(req).transaction(async(trx:any)=>{
  const row=await trx('origin_checkouts').where({cart_id:id,customer_id:customerId}).forUpdate().first();
  if(row.order_id)return row.order_id;
  if(!row.payment_method)throw error(400,'payment_required','Confirmă metoda de plată înainte de comandă.');
  // Medusa authorizes with the payment provider on the server and reserves inventory atomically.
  // No browser status, total or "paid" flag is accepted as proof of payment.
  const {result,errors,transaction}=await completeCartWorkflow(req.scope).run({input:{id},throwOnError:false});
  if(!transaction.hasFinished())throw error(409,'checkout_processing','Comanda este în curs de procesare. Reîncearcă verificarea în câteva secunde.');
  if(errors?.length)throw errors[0].error;
  if(!result?.id)throw error(409,'payment_pending','Comanda nu este încă confirmată. Reîncearcă verificarea.');
  await trx('origin_checkouts').where({id:row.id}).update({order_id:result.id});return result.id;
 });
 await queueOrderConfirmation(req.scope,orderId);
 await finalizeSamples(req.scope,customerId,orderId);
 await deliverSampleMail(req.scope,orderId).catch(()=>{});
 return getOrder(req,customerId,orderId);
}
const orderFields=['id','customer_id','display_id','status','created_at','currency_code','email','total','original_item_subtotal','original_shipping_subtotal','tax_total','discount_subtotal','shipping_address.*','items.id','items.title','items.product_title','items.variant_title','items.quantity','items.original_subtotal','items.metadata','payment_collections.status','payment_collections.payments.captured_at','payment_collections.payments.canceled_at','fulfillments.shipped_at','fulfillments.delivered_at','fulfillments.canceled_at'];
function orderView(order:any,checkout:any){
 const cash=checkout?.payment_method==='cash';
 const canceled=order.status==='canceled';
 const captured=order.payment_collections?.some((p:any)=>p.status==='completed');
 const payment=cash?(captured?'cash_paid':'cash_due'):captured?'paid':order.payment_collections?.some((p:any)=>p.status==='authorized')?'authorized':'pending';
 const fulfillment=order.fulfillments?.filter((f:any)=>!f.canceled_at)||[];
 return {id:order.id,number:order.display_id,status:order.status,createdAt:order.created_at,currency:order.currency_code,email:order.email,items:itemsView(order.items),address:order.shipping_address,subtotal:Number(order.original_item_subtotal),shipping:Number(order.original_shipping_subtotal),tax:Number(order.tax_total),discount:Number(order.discount_subtotal),total:Number(order.total),paymentMethod:cash?'cash':'stripe',paymentStatus:canceled?'canceled':payment,deliveryStatus:canceled?'canceled':fulfillment.some((f:any)=>f.delivered_at)?'delivered':fulfillment.some((f:any)=>f.shipped_at)?'shipped':'processing',testMode:true};
}
export async function getOrder(req:any,customerId:string,id:string){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(id))throw error(404,'order_not_found','Comanda nu există.');
 const {data}=await queryOf(req).graph({entity:'order',fields:orderFields,filters:{id,customer_id:customerId}});
 if(!data[0])throw error(404,'order_not_found','Comanda nu există.');
 const row=await dbOf(req)('origin_checkouts').where({order_id:id,customer_id:customerId}).first();return orderView(data[0],row);
}
export async function listOrders(req:any,customerId:string){
 const raw=Number(req.query?.offset||0),offset=Number.isInteger(raw)?Math.max(0,Math.min(10000,raw)):0;
 const {data,metadata}=await queryOf(req).graph({entity:'order',fields:orderFields,filters:{customer_id:customerId},pagination:{take:10,skip:offset,order:{created_at:'DESC'}}});
 const checkouts=await dbOf(req)('origin_checkouts').where({customer_id:customerId}).whereIn('order_id',data.map((o:any)=>o.id));
 return {orders:data.map((o:any)=>orderView(o,checkouts.find((c:any)=>c.order_id===o.id))),count:metadata?.count??data.length,offset};
}
