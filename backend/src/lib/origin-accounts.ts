import {mergeFavorites} from './origin-favorites';
import {createHash,randomBytes} from 'node:crypto';
import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
import {createCustomerAccountWorkflow} from '@medusajs/core-flows';
import {cleanExperience,OriginError} from './origin-ai';
import {registrationDetails} from './registration';

export const emptyExperience=()=>({profile:null,entries:[],badges:[],favorites:[]});
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const cookieValue=(req:any,name:string)=>(req.headers.cookie||'').split(';').map((c:string)=>c.trim()).find((c:string)=>c.startsWith(name+'='))?.slice(name.length+1)||'';
const validToken=(token:string)=>/^[a-f0-9]{64}$/.test(token);
const cookie=(res:any,name:string,value:string,maxAge:number)=>res.append('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`);
export const revision=(row:any)=>row?new Date(row.updated_at).toISOString():null;
export const customerOwner=(id:string)=>hash('customer:'+id);
export function guestIdentity(req:any,res:any,rotate=false){
 let token=cookieValue(req,'origin_session');
 if(rotate||!validToken(token)){token=randomBytes(32).toString('hex');cookie(res,'origin_session',token,2592000);}
 return hash(token);
}
export async function currentCustomer(req:any,res:any){
 const token=cookieValue(req,'origin_auth');if(!token)return null;
 const db=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 const record=validToken(token)?await db('origin_customer_sessions').where({id:hash(token)}).where('expires_at','>',new Date()).first():null;
 if(!record){cookie(res,'origin_auth','',0);throw new OriginError(401,'session_expired','Sesiunea a expirat. Autentifică-te din nou pentru jurnalul personal.');}
 let customer:any;try{customer=await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(record.customer_id);}catch{}
 if(!customer||!customer.has_account){cookie(res,'origin_auth','',0);throw new OriginError(401,'session_expired','Contul nu mai este disponibil. Autentifică-te din nou.');}
 return {id:customer.id,email:customer.email,firstName:customer.first_name||'',lastName:customer.last_name||'',phone:customer.phone||''};
}

export function cleanCredentials(body:any,register:boolean){
 const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
 const password=typeof body?.password==='string'?body.password:'';
 let details={firstName:'',lastName:'',phone:''};
 if(register)try{details=registrationDetails(body);}catch(e:any){throw new OriginError(400,'invalid_registration',e.message);}
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new OriginError(400,'invalid_email','Introdu o adresă de e-mail validă.');
 if(password.length>(128)||password.length<(register?8:1))throw new OriginError(400,'invalid_password',register?'Parola trebuie să aibă între 8 și 128 de caractere.':'Introdu parola contului.');
 return {email,password,...details};
}

export function mergeExperience(existing:any,incoming:any){
 const a=cleanExperience(existing),b=cleanExperience(incoming);
 const entries=new Map<string,any>();
 for(const entry of [...a.entries,...b.entries])if(entry.id&&!entries.has(entry.id))entries.set(entry.id,entry);
 return cleanExperience({profile:a.profile||b.profile,entries:[...entries.values()].sort((a,b)=>b.date.localeCompare(a.date)),badges:[...new Set([...a.badges,...b.badges])],favorites:mergeFavorites(a.favorites,b.favorites)});
}

const attempts=new Map<string,{count:number;until:number}>();
export function limitAccounts(req:any){
 const now=Date.now(),key=req.socket?.remoteAddress||'local';let entry=attempts.get(key);
 if(!entry||entry.until<now){entry={count:0,until:now+15*60000};attempts.set(key,entry);}
 if(entry.count>=20)throw new OriginError(429,'auth_limit','Prea multe încercări. Revino peste 15 minute.');entry.count++;
 if(attempts.size>1000)for(const [key,value] of attempts)if(value.until<now)attempts.delete(key);
}

export async function authenticateCustomer(req:any,res:any,register:boolean){
 limitAccounts(req);const credentials=cleanCredentials(req.body,register);
 if(await currentCustomer(req,res))throw new OriginError(409,'already_signed_in','Deconectează-te înainte de a folosi alt cont.');
 const auth=req.scope.resolve(Modules.AUTH);
 const authData={actor_type:'customer',url:req.url,headers:req.headers,query:{},protocol:req.protocol,body:{email:credentials.email,password:credentials.password}};
 const result=register?await auth.register('emailpass',authData):await auth.authenticate('emailpass',authData);
 if(!result.success||!result.authIdentity||result.mfaChallenge)throw new OriginError(register?409:401,register?'registration_failed':'invalid_credentials',register?'Contul nu a putut fi creat. Dacă ai deja un cont, autentifică-te.':'E-mailul sau parola nu sunt corecte.');
 let id=result.authIdentity.app_metadata?.customer_id;
 if(!id){
  const {result:created}=await createCustomerAccountWorkflow(req.scope).run({input:{authIdentityId:result.authIdentity.id,customerData:{email:credentials.email,first_name:credentials.firstName||credentials.email.split('@')[0],last_name:credentials.lastName,phone:credentials.phone}}});
  id=created.id;
 }
 const db=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION),owner=customerOwner(id),guest=guestIdentity(req,res);
 // Transferă numai datele vizitatorului curent. Datele deja existente în cont au prioritate.
 await db.transaction(async(trx:any)=>{
  await trx('origin_experience').insert({id:owner,data:JSON.stringify(emptyExperience()),updated_at:new Date()}).onConflict('id').ignore();
  const account=await trx('origin_experience').where({id:owner}).forUpdate().first();
  const anonymous=await trx('origin_experience').where({id:guest}).forUpdate().first();
  const guestData=mergeExperience(anonymous?.data,req.body.guestExperience);
  const data=mergeExperience(account.data,guestData);
  await trx('origin_experience').where({id:owner}).update({data:JSON.stringify(data),updated_at:new Date()});
  if(anonymous)await trx('origin_experience').where({id:guest}).delete();
  if(register)await trx('origin_welcome_outbox').insert({customer_id:id,status:'pending'}).onConflict('customer_id').ignore();
 });
 const token=randomBytes(32).toString('hex');
 await db('origin_customer_sessions').insert({id:hash(token),customer_id:id,expires_at:new Date(Date.now()+7*86400000),created_at:new Date()});
 cookie(res,'origin_auth',token,7*86400);guestIdentity(req,res,true);
 const customer=await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(id);
 return {id:customer.id,email:customer.email,firstName:customer.first_name||'',lastName:customer.last_name||'',phone:customer.phone||''};
}

export async function logoutCustomer(req:any,res:any){
 const token=cookieValue(req,'origin_auth');
 if(validToken(token)){const db=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);await db('origin_customer_sessions').where({id:hash(token)}).delete();}
 cookie(res,'origin_auth','',0);guestIdentity(req,res,true);
}

export async function rotateCustomerSession(req:any,res:any,customerId:string){
 const db=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION),token=randomBytes(32).toString('hex');
 await db.transaction(async(trx:any)=>{await trx('origin_customer_sessions').where({customer_id:customerId}).delete();await trx('origin_customer_sessions').insert({id:hash(token),customer_id:customerId,expires_at:new Date(Date.now()+7*86400000),created_at:new Date()});});
 cookie(res,'origin_auth',token,7*86400);
}
