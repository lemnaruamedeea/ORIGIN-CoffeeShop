import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
import {mailConfig,mailTransport} from './origin-mail';
import {sendWelcomeEmail} from './registration';

export async function ensureWelcomeStorage(db:any){
 if(!await db.schema.hasTable('origin_welcome_outbox'))await db.schema.createTable('origin_welcome_outbox',(t:any)=>{
  t.string('customer_id').primary();t.string('status').notNullable().defaultTo('pending').index();t.integer('attempts').notNullable().defaultTo(0);t.timestamp('created_at',{useTz:true}).notNullable().defaultTo(db.fn.now());t.timestamp('next_attempt_at',{useTz:true});t.timestamp('locked_at',{useTz:true});t.timestamp('sent_at',{useTz:true});t.text('last_error');
 });
}
export async function deliverWelcomeMail(scope:any,customerId?:string){
 const db:any=scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 if(!mailConfig().configured||!await db.schema.hasTable('origin_welcome_outbox'))return;
 await db('origin_welcome_outbox').where({status:'sending'}).where('locked_at','<',new Date(Date.now()-5*60000)).update({status:'pending',locked_at:null});
 const pending=db('origin_welcome_outbox').whereIn('status',['pending','failed']).where('attempts','<',6).where((b:any)=>b.whereNull('next_attempt_at').orWhere('next_attempt_at','<=',new Date()));
 if(customerId)pending.where({customer_id:customerId});
 const rows=await pending.orderBy('created_at').limit(10);
 for(const row of rows){
  const claimed=await db('origin_welcome_outbox').where({customer_id:row.customer_id}).whereIn('status',['pending','failed']).update({status:'sending',locked_at:new Date(),attempts:db.raw('attempts + 1')}).returning('customer_id');if(!claimed.length)continue;
  try{
   const customer=await scope.resolve(Modules.CUSTOMER).retrieveCustomer(row.customer_id);
   if(!customer?.has_account){await db('origin_welcome_outbox').where({customer_id:row.customer_id}).update({status:'canceled',locked_at:null});continue;}
   const cfg=mailConfig(),transport=mailTransport();
   await sendWelcomeEmail(customer,message=>transport.sendMail({...message,messageId:`<welcome-${row.customer_id}@${cfg.from.split('@')[1]}>`}),cfg.from,cfg.url);
   await db('origin_welcome_outbox').where({customer_id:row.customer_id}).update({status:'sent',sent_at:new Date(),locked_at:null,last_error:null});
  }catch{await db('origin_welcome_outbox').where({customer_id:row.customer_id}).update({status:'failed',locked_at:null,last_error:'Trimiterea nu a fost confirmată de serviciul e-mail.',next_attempt_at:new Date(Date.now()+Math.min(60,2**Number(row.attempts))*60000)});}
 }
}
