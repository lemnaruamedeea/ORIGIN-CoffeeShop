import {randomBytes} from 'node:crypto';
import {ContainerRegistrationKeys,Modules,PromotionActions} from '@medusajs/framework/utils';
import {createPromotionsWorkflow,updateCartPromotionsWorkflow} from '@medusajs/core-flows';
import {OriginError} from './origin-ai';
import {FIRST_ORDER_CODE,FREE_SHIPPING_CODE,FIRST_ORDER_MINIMUM,FREE_SHIPPING_MINIMUM,REWARD_DAYS,normalizeEmail,couponCode,freeShipping,rewardValid,netItems} from './origin-promotions-core';
const dbOf=(scope:any)=>scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
const queryOf=(scope:any)=>scope.resolve(ContainerRegistrationKeys.QUERY);
const reject=(message:string)=>{throw new OriginError(400,'promotion_invalid',message);};
const fields=['id','customer_id','email','currency_code','completed_at','original_item_subtotal','original_shipping_subtotal','discount_subtotal','item_subtotal','shipping_subtotal','total','promotions.code','items.id','items.variant_id','items.metadata','items.quantity','items.original_subtotal','items.adjustments.*','shipping_methods.id','shipping_methods.shipping_option_id','shipping_methods.adjustments.*'];
export async function promotionCart(scope:any,id:string){const {data}=await queryOf(scope).graph({entity:'cart',fields,filters:{id}});return data[0];}
export async function firstOrderEligible(scope:any,cart:any){
 if(!normalizeEmail(cart.email)||Number(cart.original_item_subtotal)<FIRST_ORDER_MINIMUM)return false;
 const db=dbOf(scope);
 // Compare both account and normalized e-mail, including historical guest orders.
 const prior=await db('order').whereNull('deleted_at').whereNot('status','canceled').where((b:any)=>b.where('customer_id',cart.customer_id).orWhereRaw('lower(trim(email)) = ?',[normalizeEmail(cart.email)])).first('id');
 return !prior;
}
export async function ensurePromotionStorage(scope:any){
 const db=dbOf(scope);
 if(!await db.schema.hasColumn('origin_checkouts','promotion_code'))await db.schema.alterTable('origin_checkouts',(t:any)=>t.string('promotion_code'));
 if(!await db.schema.hasColumn('origin_mystery_samples','reward_checked_at'))await db.schema.alterTable('origin_mystery_samples',(t:any)=>t.timestamp('reward_checked_at',{useTz:true}));
 if(!await db.schema.hasTable('origin_tasting_rewards'))await db.schema.createTable('origin_tasting_rewards',(t:any)=>{
  t.string('order_id').primary();t.string('email').notNullable();t.string('code').unique().notNullable();t.string('promotion_id');t.jsonb('variant_ids').notNullable();t.timestamp('expires_at',{useTz:true}).notNullable();
  t.string('mail_status').notNullable().defaultTo('pending');t.integer('attempts').notNullable().defaultTo(0);t.timestamp('locked_at',{useTz:true});t.timestamp('next_attempt_at',{useTz:true});t.timestamp('sent_at',{useTz:true});t.timestamp('created_at',{useTz:true}).notNullable().defaultTo(db.fn.now());
 });
}
export async function setupPromotions(scope:any){
 await ensurePromotionStorage(scope);
 const service=scope.resolve(Modules.PROMOTION);
 const definitions:any[]=[{
  code:FIRST_ORDER_CODE,type:'standard',status:'active',is_automatic:false,
  application_method:{type:'percentage',value:10,target_type:'items',allocation:'across',currency_code:'ron'},
  rules:[{attribute:'origin_first_order',operator:'eq',values:['true']}],
  campaign:{name:'Bun venit în ORIGIN',campaign_identifier:'origin-first-order-v1',budget:{type:'use_by_attribute',attribute:'customer_email',limit:1}},
  metadata:{origin_managed:true,description:'10% la prima comandă de minimum 80 lei. O utilizare per e-mail.'}
 },{
  code:FREE_SHIPPING_CODE,type:'standard',status:'active',is_automatic:false,
  application_method:{type:'percentage',value:100,target_type:'shipping_methods',allocation:'across',currency_code:'ron'},
  rules:[{attribute:'origin_free_shipping',operator:'eq',values:['true']}],
  metadata:{origin_managed:true,description:'Transport standard gratuit de la 180 lei după reducerea produselor; aplicat automat de checkout.'}
 }];
 for(const def of definitions)if(!(await service.listPromotions({code:def.code})).length)await createPromotionsWorkflow(scope).run({input:{promotionsData:[def]}});
}
export async function assertCoupon(scope:any,cart:any,code:string){
 if(!code)return;
 if(cart.email!==normalizeEmail(cart.email))reject('Reia checkoutul pentru a confirma adresa de e-mail.');
 if(code===FIRST_ORDER_CODE){if(!await firstOrderEligible(scope,cart))reject('PRIMAORIGINE este valabil la prima comandă de minimum 80 lei, o singură dată per client și e-mail.');}
 else {
  const reward=await dbOf(scope)('origin_tasting_rewards').where({code}).first();
  if(!rewardValid(reward,cart.email))reject('Codul nu este disponibil pentru acest e-mail, a expirat sau nu este valid.');
  const {data:orders}=await queryOf(scope).graph({entity:'order',fields:['id','status','payment_collections.status'],filters:{id:reward.order_id}});
  if(!orders[0]||orders[0].status==='canceled'||!orders[0].payment_collections?.some((p:any)=>p.status==='completed'))reject('Reducerea Mystery Tasting este disponibilă numai pentru un set achitat, dintr-o comandă neanulată.');
  if(!cart.items.some((i:any)=>reward.variant_ids.includes(i.variant_id)&&!i.metadata?.origin_mystery_component))reject('Adaugă un pachet de 250 g din cafelele setului Mystery Tasting pentru a folosi codul.');
 }
 const promotions=await scope.resolve(Modules.PROMOTION).listPromotions({code},{relations:['campaign','application_method']});
 const p=promotions[0];
 if(!p||p.status!=='active'||(p.limit!=null&&p.used>=p.limit))reject('Codul a fost deja folosit sau nu mai este activ.');
 const now=Date.now();if(p.campaign?.ends_at&&new Date(p.campaign.ends_at).getTime()<=now)reject('Codul promoțional a expirat.');
}
export async function promotionContext(scope:any,cart:any){
 const row=await dbOf(scope)('origin_checkouts').where({cart_id:cart.id,customer_id:cart.customer_id}).first();
 if(!row)return {origin_first_order:false,origin_free_shipping:false,customer_email:normalizeEmail(cart.email)};
 const methods=cart.shipping_methods||[];
 const ids=methods.map((m:any)=>m.shipping_option_id).filter(Boolean);
 const options=ids.length?await scope.resolve(Modules.FULFILLMENT).listShippingOptions({id:ids},{relations:['type']}):[];
 const standard=methods.length===1&&options.find((o:any)=>o.id===methods[0].shipping_option_id)?.type?.code==='standard';
 return {origin_first_order:row.promotion_code===FIRST_ORDER_CODE&&await firstOrderEligible(scope,cart),origin_free_shipping:!!standard&&freeShipping(netItems(cart)),customer_email:normalizeEmail(cart.email)};
}
export async function refreshPromotions(scope:any,cartId:string,code:string){
 const row=await dbOf(scope)('origin_checkouts').where({cart_id:cartId}).first();
 if(!row||row.payment_method||row.order_id)return;
 let cart=await promotionCart(scope,cartId);await assertCoupon(scope,cart,code);
 if((row.promotion_code||'')!==code)await dbOf(scope)('origin_checkouts').where({cart_id:cartId}).update({promotion_code:code||null});
 // First settle product discounts, then evaluate the delivery threshold on the net items.
 await updateCartPromotionsWorkflow(scope).run({input:{cart_id:cartId,promo_codes:code?[code]:[],action:PromotionActions.REPLACE}});
 cart=await promotionCart(scope,cartId);
 if(code&&!cart.items.some((i:any)=>i.adjustments?.some((a:any)=>a.code===code&&Number(a.amount)>0)))reject('Reducerea nu a putut fi aplicată. Verifică eligibilitatea și disponibilitatea codului.');
 const context=await promotionContext(scope,cart);
 if(context.origin_free_shipping)await updateCartPromotionsWorkflow(scope).run({input:{cart_id:cartId,promo_codes:[...(code?[code]:[]),FREE_SHIPPING_CODE],action:PromotionActions.REPLACE}});
}
export async function changePromotion(req:any,customerId:string,id:string){
 const code=couponCode(req.body?.code);if(code===null)reject('Introdu un cod promoțional valid.');
 const db=dbOf(req.scope);
 return db.transaction(async(trx:any)=>{
  await trx.raw('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))',[id]);
  const row=await trx('origin_checkouts').where({cart_id:id,customer_id:customerId}).first();
  if(!row)throw new OriginError(404,'checkout_not_found','Checkout-ul nu există.');
  if(row.payment_method||row.order_id)throw new OriginError(409,'checkout_locked','Codul se poate modifica numai înainte de inițializarea plății.');
  try{await refreshPromotions(req.scope,id,code||'');}catch(e){await refreshPromotions(req.scope,id,row.promotion_code||'').catch(()=>{});throw e;}
 });
}
export async function validatePromotions(scope:any,cart:any){
 const codes=(cart.items||[]).flatMap((i:any)=>(i.adjustments||[]).map((a:any)=>a.code)).concat((cart.shipping_methods||[]).flatMap((s:any)=>(s.adjustments||[]).map((a:any)=>a.code))).filter(Boolean);
 const row=await dbOf(scope)('origin_checkouts').where({cart_id:cart.id}).first();
 if(!row){if(codes.some((c:string)=>c===FIRST_ORDER_CODE||c===FREE_SHIPPING_CODE||c.startsWith('MYSTERY15-')))reject('Promoția trebuie folosită în checkoutul magazinului.');return;}
 if(row.order_id)return;
 const code=row.promotion_code||'';
 if(code)await assertCoupon(scope,cart,code);
 if(codes.some((c:string)=>c!==code&&c!==FREE_SHIPPING_CODE))reject('Reducerile produselor nu se cumulează. Reia checkoutul.');
 if(code&&!codes.includes(code))reject('Reducerea nu mai este disponibilă. Reia checkoutul înainte de plată.');
 if(codes.includes(FREE_SHIPPING_CODE)&&!(await promotionContext(scope,cart)).origin_free_shipping)reject('Pragul pentru transport gratuit nu mai este îndeplinit.');
}
export async function ensureTastingReward(scope:any,orderId:string){
 const db=dbOf(scope);
 if(!await db.schema.hasTable('origin_tasting_rewards'))return null;
 const samples=await db('origin_mystery_samples').where({order_id:orderId});if(!samples.length)return null;
 const {data}=await queryOf(scope).graph({entity:'order',fields:['id','email','status','payment_collections.status'],filters:{id:orderId}});
 const order=data[0];if(!order||order.status==='canceled'||!order.payment_collections?.some((p:any)=>p.status==='completed'))return null;
 const {data:products}=await queryOf(scope).graph({entity:'product',fields:['id','handle','variants.id','variants.weight'],filters:{handle:[...new Set(samples.map((s:any)=>s.coffee_handle))]}});
 const variantIds=products.flatMap((p:any)=>p.variants.filter((v:any)=>Number(v.weight)===250).map((v:any)=>v.id));if(!variantIds.length)return null;
 await db('origin_tasting_rewards').insert({order_id:orderId,email:normalizeEmail(order.email),code:'MYSTERY15-'+randomBytes(8).toString('hex').toUpperCase(),variant_ids:JSON.stringify(variantIds),expires_at:new Date(Date.now()+REWARD_DAYS*86400000)}).onConflict('order_id').ignore();
 // Serialize retries and the scheduled reconciliation; the code/expiry are generated once.
 return db.transaction(async(trx:any)=>{
  const row=await trx('origin_tasting_rewards').where({order_id:orderId}).forUpdate().first();
  if(!row.promotion_id){
   let p=(await scope.resolve(Modules.PROMOTION).listPromotions({code:row.code}))[0];
   if(!p){const {result}=await createPromotionsWorkflow(scope).run({input:{promotionsData:[{
    code:row.code,type:'standard',status:'active',is_automatic:false,limit:1,
    application_method:{type:'percentage',value:15,target_type:'items',allocation:'once',max_quantity:1,currency_code:'ron',target_rules:[{attribute:'items.variant_id',operator:'in',values:row.variant_ids}]},
    rules:[{attribute:'email',operator:'eq',values:[row.email]}],
    campaign:{name:'De la mostră la cafeaua preferată',campaign_identifier:'origin-tasting-'+orderId,ends_at:new Date(row.expires_at)},metadata:{origin_managed:true,source_order:orderId}
   }]}});p=result[0];}
   await trx('origin_tasting_rewards').where({order_id:orderId}).update({promotion_id:p.id});row.promotion_id=p.id;
  }return row;
 });
}
export async function orderReward(scope:any,orderId:string,customerId:string){
 const {data}=await queryOf(scope).graph({entity:'order',fields:['id'],filters:{id:orderId,customer_id:customerId}});if(!data[0])return null;
 const r=await ensureTastingReward(scope,orderId);if(!r)return null;
 const p=(await scope.resolve(Modules.PROMOTION).listPromotions({code:r.code}))[0];
 return {code:r.code,expiresAt:r.expires_at,used:Number(p?.used||0)>0,expired:new Date(r.expires_at).getTime()<=Date.now()};
}
export {FIRST_ORDER_CODE,FREE_SHIPPING_CODE,FIRST_ORDER_MINIMUM,FREE_SHIPPING_MINIMUM};
