import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {randomUUID} from 'node:crypto';
import {allowOrigin,fail} from '../../../../lib/origin-store';
import {currentCustomer} from '../../../../lib/origin-accounts';
import {OriginError} from '../../../../lib/origin-ai';

const problem=(status:number,code:string,message:string)=>new OriginError(status,code,message);
const attempts=new Map<string,{count:number;until:number}>();
async function context(req:any,res:any,write=false){
 allowOrigin(req);res.setHeader('Cache-Control','no-store');
 const handle=req.params.handle;
 if(!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(handle))throw problem(404,'product_not_found','Cafeaua nu există în catalog.');
 const query=req.scope.resolve(ContainerRegistrationKeys.QUERY);
 const {data}=await query.graph({entity:'product',fields:['id'],filters:{handle,status:'published'}});
 if(!data[0])throw problem(404,'product_not_found','Cafeaua nu există în catalog.');
 let customer:any=null;
 try{customer=await currentCustomer(req,res);}catch(e){if(write||!(e instanceof OriginError)||e.status!==401)throw e;}
 if(write){
  if(!customer)throw problem(401,'login_required','Autentifică-te pentru a publica o recenzie.');
  const now=Date.now();let a=attempts.get(customer.id);
  if(!a||a.until<now){a={count:0,until:now+600000};attempts.set(customer.id,a);}
  if(++a.count>30)throw problem(429,'review_limit','Ai trimis multe modificări. Încearcă din nou peste câteva minute.');
  if(attempts.size>1000)for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
 }
 return {db:req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION),productId:data[0].id,customer};
}
function clean(raw:any){
 if(!Number.isInteger(raw?.rating)||raw.rating<1||raw.rating>5)throw problem(400,'invalid_rating','Alege o evaluare între 1 și 5 stele.');
 const title=typeof raw.title==='string'?raw.title.trim():'',body=typeof raw.body==='string'?raw.body.trim():'';
 if(title.length<3||title.length>80||body.length<10||body.length>1500||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(title+body))throw problem(400,'invalid_review','Scrie un titlu de 3–80 de caractere și o recenzie de 10–1500 de caractere.');
 return {rating:raw.rating,title,body};
}
const revision=(r:any)=>new Date(r.updated_at).toISOString();
function view(r:any,customerId?:string){return {id:r.id,author:r.author_name,rating:r.rating,title:r.title,body:r.body,createdAt:new Date(r.created_at).toISOString(),updatedAt:revision(r),mine:r.customer_id===customerId};}
export async function GET(req:MedusaRequest,res:MedusaResponse){try{
 const {db,productId,customer}=await context(req,res),raw=Number(req.query.offset||0),offset=Number.isInteger(raw)?Math.max(0,Math.min(raw,10000)):0;
 const [groups,rows,mine]=await Promise.all([
  db('origin_reviews').where({product_id:productId}).select('rating').count('* as count').groupBy('rating'),
  db('origin_reviews').where({product_id:productId}).orderBy([{column:'created_at',order:'desc'},{column:'id',order:'desc'}]).offset(offset).limit(5),
  customer?db('origin_reviews').where({product_id:productId,customer_id:customer.id}).first():null,
 ]);
 const distribution=[5,4,3,2,1].map(rating=>({rating,count:Number(groups.find((g:any)=>g.rating===rating)?.count||0)}));
 const count=distribution.reduce((s,d)=>s+d.count,0),average=count?distribution.reduce((s,d)=>s+d.rating*d.count,0)/count:0;
 res.json({reviews:rows.map((r:any)=>view(r,customer?.id)),mine:mine?view(mine,customer.id):null,count,average,distribution,offset});
 }catch(e){fail(res,e);}}
export async function POST(req:MedusaRequest,res:MedusaResponse){try{
 const {db,productId,customer}=await context(req,res,true),data=clean(req.body),now=new Date();
 const rows=await db('origin_reviews').insert({id:randomUUID(),product_id:productId,customer_id:customer.id,author_name:customer.firstName.trim().split(/\s+/)[0].slice(0,40)||'Client ORIGIN',...data,created_at:now,updated_at:now}).onConflict(['product_id','customer_id']).ignore().returning('*');
 if(!rows.length)throw problem(409,'review_exists','Ai deja o recenzie pentru această cafea. O poți modifica.');
 res.status(201).json({review:view(rows[0],customer.id)});
 }catch(e){fail(res,e);}}
async function ownChange(req:any,res:any,remove:boolean){
 const {db,productId,customer}=await context(req,res,true),data=remove?null:clean(req.body);
 return db.transaction(async(trx:any)=>{
  const row=await trx('origin_reviews').where({product_id:productId,customer_id:customer.id}).forUpdate().first();
  if(!row)throw problem(404,'review_not_found','Recenzia ta nu există.');
  if(req.body?.revision!==revision(row))throw problem(409,'review_conflict','Recenzia a fost modificată în altă fereastră. Reîncarcă înainte de a continua.');
  if(remove){await trx('origin_reviews').where({id:row.id,customer_id:customer.id}).delete();return {removed:true};}
  const updated=new Date(Math.max(Date.now(),new Date(row.updated_at).getTime()+1));
  const [saved]=await trx('origin_reviews').where({id:row.id,customer_id:customer.id}).update({...data,updated_at:updated}).returning('*');
  return {review:view(saved,customer.id)};
 });
}
export async function PUT(req:MedusaRequest,res:MedusaResponse){try{res.json(await ownChange(req,res,false));}catch(e){fail(res,e);}}
export async function DELETE(req:MedusaRequest,res:MedusaResponse){try{res.json(await ownChange(req,res,true));}catch(e){fail(res,e);}}
