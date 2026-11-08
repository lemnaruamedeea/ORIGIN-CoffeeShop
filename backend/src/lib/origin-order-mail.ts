import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {mailConfig,mailTransport} from './origin-mail';
import {orderConfirmation} from './order-confirmation';
import {getOrder} from './origin-checkout';
export async function ensureOrderMailStorage(db:any){if(!await db.schema.hasTable('origin_order_mail'))await db.schema.createTable('origin_order_mail',(t:any)=>{t.string('order_id').primary();t.string('status').notNullable().defaultTo('pending').index();t.integer('attempts').notNullable().defaultTo(0);t.timestamp('created_at',{useTz:true}).notNullable().defaultTo(db.fn.now());t.timestamp('next_attempt_at',{useTz:true});t.timestamp('locked_at',{useTz:true});t.timestamp('sent_at',{useTz:true});t.text('last_error');});}
export async function queueOrderConfirmation(scope:any,id:string){const db=scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);await db('origin_order_mail').insert({order_id:id}).onConflict('order_id').ignore();}
export async function deliverOrderConfirmations(scope:any,orderId?:string){
 const db=scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);if(!mailConfig().configured||!await db.schema.hasTable('origin_order_mail'))return;
 await db('origin_order_mail').where({status:'sending'}).where('locked_at','<',new Date(Date.now()-300000)).update({status:'pending',locked_at:null});
 const pending=db('origin_order_mail').whereIn('status',['pending','failed']).where('attempts','<',6).where((b:any)=>b.whereNull('next_attempt_at').orWhere('next_attempt_at','<=',new Date()));if(orderId)pending.where({order_id:orderId});
 for(const row of await pending.orderBy('created_at').limit(10)){
  const claimed=await db('origin_order_mail').where({order_id:row.order_id}).whereIn('status',['pending','failed']).update({status:'sending',locked_at:new Date(),attempts:db.raw('attempts + 1')}).returning('order_id');if(!claimed.length)continue;
  try{const {data}=await scope.resolve(ContainerRegistrationKeys.QUERY).graph({entity:'order',fields:['id','customer_id','email','status'],filters:{id:row.order_id}});const native=data[0];
   if(!native||native.status==='canceled'){await db('origin_order_mail').where({order_id:row.order_id}).update({status:'canceled',locked_at:null});continue;}
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(native.email)||/\.(local|test|invalid|example)$/i.test(native.email))throw Error('Recipient not deliverable');
   const order=await getOrder({scope},native.customer_id,native.id),cfg=mailConfig();
   const result=await mailTransport().sendMail({from:{name:'ORIGIN Coffee',address:cfg.from},to:native.email,...orderConfirmation(order),messageId:`<order-${native.id}@${cfg.from.split('@')[1]}>`,disableFileAccess:true,disableUrlAccess:true});
   if(!result.accepted?.some((e:any)=>String(e).toLowerCase()===native.email.toLowerCase()))throw Error('Mail not accepted');
   await db('origin_order_mail').where({order_id:row.order_id}).update({status:'sent',sent_at:new Date(),locked_at:null,last_error:null});
  }catch{await db('origin_order_mail').where({order_id:row.order_id}).update({status:'failed',locked_at:null,last_error:'Trimiterea nu a fost confirmată de serviciul e-mail.',next_attempt_at:new Date(Date.now()+Math.min(60,2**Number(row.attempts))*60000)});}
 }
}
