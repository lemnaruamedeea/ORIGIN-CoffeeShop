import {randomBytes,createHash} from 'node:crypto';
import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
export async function ensureGuestCheckoutStorage(db:any){if(!await db.schema.hasTable('origin_checkout_guests'))await db.schema.createTable('origin_checkout_guests',(t:any)=>{t.string('id',64).primary();t.string('customer_id');t.timestamp('expires_at',{useTz:true}).notNullable();});}
export async function guestCheckoutCustomer(req:any,res:any){
 let token=(req.headers.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith('origin_checkout_guest='))?.split('=')[1]||'';
 const db=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 let id=/^[a-f0-9]{64}$/.test(token)?createHash('sha256').update(token).digest('hex'):'';
 let existing=id?await db('origin_checkout_guests').where({id}).where('expires_at','>',new Date()).first():null;
 if(!existing){token=randomBytes(32).toString('hex');id=createHash('sha256').update(token).digest('hex');await db('origin_checkout_guests').insert({id,expires_at:new Date(Date.now()+30*86400000)});res.append('Set-Cookie',`origin_checkout_guest=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV==='production'?'; Secure':''}`);}
 return db.transaction(async(trx:any)=>{const row=await trx('origin_checkout_guests').where({id}).forUpdate().first();let customerId=row.customer_id;
  if(!customerId){const customer=await req.scope.resolve(Modules.CUSTOMER).createCustomers({has_account:false,metadata:{origin_guest_checkout:true}});customerId=customer.id;await trx('origin_checkout_guests').where({id}).update({customer_id:customerId});}
  return {id:customerId,email:'',firstName:'',guest:true};
 });
}
