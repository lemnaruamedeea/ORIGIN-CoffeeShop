import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
import {currentCustomer,cleanCredentials,customerOwner,limitAccounts,logoutCustomer,rotateCustomerSession} from './origin-accounts';
import {registrationDetails,passwordChangeFields} from './registration';
import {OriginError} from './origin-ai';
async function verifiedAccount(req:any,res:any){
 limitAccounts(req);const c=await currentCustomer(req,res);if(!c)throw new OriginError(401,'login_required','Autentifică-te pentru a gestiona contul.');
 const {password}=cleanCredentials({email:c.email,password:req.body?.password},false);
 const auth=req.scope.resolve(Modules.AUTH),result=await auth.authenticate('emailpass',{url:req.url,headers:req.headers,query:{},protocol:req.protocol,body:{email:c.email,password}});
 if(!result.success||result.authIdentity?.app_metadata?.customer_id!==c.id)throw new OriginError(401,'invalid_password','Parola curentă nu este corectă.');
 return {c,auth,identity:result.authIdentity};
}
export async function updateAccount(req:any,res:any){
 const {c,auth,identity}=await verifiedAccount(req,res);let details:any;
 try{details=registrationDetails(req.body);}catch(e:any){throw new OriginError(400,'invalid_registration',e.message);}
 const {email}=cleanCredentials({email:req.body.email,password:req.body.password},false);
 const customers=req.scope.resolve(Modules.CUSTOMER),changed=email!==c.email;
 const provider=identity.provider_identities?.find((p:any)=>p.provider==='emailpass');
 if(changed){
  const duplicate=await customers.listCustomers({email,has_account:true});const identities=await auth.listProviderIdentities({provider:'emailpass',entity_id:email});
  if(duplicate.some((x:any)=>x.id!==c.id)||identities.some((x:any)=>x.auth_identity_id!==identity.id))throw new OriginError(409,'email_taken','Această adresă de e-mail este deja utilizată.');
  if(!provider)throw new OriginError(409,'identity_missing','Contul nu poate fi modificat momentan.');
  await auth.updateProviderIdentities({id:provider.id,entity_id:email});
 }
 try{await customers.updateCustomers(c.id,{email,first_name:details.firstName,last_name:details.lastName,phone:details.phone});}
 catch(e){if(changed)await auth.updateProviderIdentities({id:provider.id,entity_id:c.email});throw e;}
 // Other devices must sign in using the new address; this session remains usable.
 if(changed){const db=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);const {createHash}=await import('node:crypto');const token=(req.headers.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith('origin_auth='))?.split('=')[1]||'';await db('origin_customer_sessions').where({customer_id:c.id}).whereNot({id:createHash('sha256').update(token).digest('hex')}).delete();}
 return {id:c.id,email,...details};
}
export async function deleteAccount(req:any,res:any){
 const {c,auth,identity}=await verifiedAccount(req,res);
 if(req.body?.confirmation!=='STERGE')throw new OriginError(400,'confirmation_required','Scrie STERGE pentru a confirma ștergerea contului.');
 // Native orders retain their historical shipping/billing snapshot. Login and personal content are removed.
 await req.scope.resolve(Modules.CUSTOMER).softDeleteCustomers([c.id]);
 const db=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 await db.transaction(async(trx:any)=>{await trx('origin_customer_sessions').where({customer_id:c.id}).delete();await trx('origin_experience').where({id:customerOwner(c.id)}).delete();if(await trx.schema.hasTable('origin_reviews'))await trx('origin_reviews').where({customer_id:c.id}).delete();if(await trx.schema.hasTable('origin_welcome_outbox'))await trx('origin_welcome_outbox').where({customer_id:c.id}).update({status:'canceled',locked_at:null});});
 await auth.deleteAuthIdentities([identity.id]);await logoutCustomer(req,res);
}

export async function changePassword(req:any,res:any){
 const {c,auth}=await verifiedAccount(req,res);let newPassword:string;
 try{newPassword=passwordChangeFields(req.body).newPassword;}catch(e:any){throw new OriginError(400,'invalid_new_password',e.message);}
 // The provider performs its normal scrypt hashing; no password is stored in experience or logs.
 const result=await auth.updateProvider('emailpass',{entity_id:c.email,password:newPassword});
 if(!result.success)throw new OriginError(503,'password_update_failed','Parola nu a putut fi schimbată. Încearcă din nou.');
 await rotateCustomerSession(req,res,c.id);
}
