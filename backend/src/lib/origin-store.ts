import {poolFromProducts} from './origin-mystery';
import {availableSets} from './origin-mystery-core';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {cleanExperience,OriginError} from './origin-ai';
import {currentCustomer,customerOwner,guestIdentity,revision} from './origin-accounts';

export function allowOrigin(req:any) {
  const origin=req.headers.origin;
  const allowed=(process.env.ORIGIN_STOREFRONT_URLS||'http://127.0.0.1:5173,http://localhost:5173').split(',');
  if(origin&&!allowed.includes(origin))throw new OriginError(403,'origin_denied','Această origine nu este permisă.');
  if(req.headers['sec-fetch-site']==='cross-site')throw new OriginError(403,'origin_denied','Această origine nu este permisă.');
  if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&!String(req.headers['content-type']||'').startsWith('application/json'))throw new OriginError(415,'json_required','Cererea trebuie trimisă în format JSON.');
}
export function fail(res:any,error:any) {
  const known=error instanceof OriginError;
  return res.status(known?error.status:503).json({error:known?error.code:'service_unavailable',message:known?error.message:'Serverul magazinului nu este disponibil momentan.'});
}
const usage=new Map<string,{count:number;reset:number}>();
let daily={count:0,date:''};
export function limitAI(req:any) {
  const now=Date.now(),key=req.socket?.remoteAddress||'local',entry=usage.get(key);
  if(!entry||entry.reset<now)usage.set(key,{count:1,reset:now+60000});
  else if(entry.count>=6)throw new OriginError(429,'local_limit','Așteaptă un minut înainte de următoarea întrebare.');else entry.count++;
  if(usage.size>1000)for(const [key,value] of usage)if(value.reset<now)usage.delete(key);
  const date=new Date().toISOString().slice(0,10);if(daily.date!==date)daily={count:0,date};
  const max=Math.max(1,Math.min(1000,Number(process.env.ORIGIN_AI_DAILY_LIMIT)||100));
  if(daily.count>=max)throw new OriginError(429,'daily_limit','Limita zilnică a asistentului a fost atinsă.');daily.count++;
}
export async function session(req:any,res:any) {
  const db=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const customer=await currentCustomer(req,res);
  const id=customer?customerOwner(customer.id):guestIdentity(req,res);
  const row=await db('origin_experience').where({id}).first();
  return {db,id,customer,revision:revision(row),data:row?cleanExperience(row.data):null};
}
export async function catalog(scope:any) {
  const query=scope.resolve(ContainerRegistrationKeys.QUERY);
  const {data}=await query.graph({entity:'product',fields:['id','title','handle','description','metadata','variants.id','variants.title','variants.sku','variants.weight','variants.metadata','variants.manage_inventory','variants.allow_backorder','variants.price_set.prices.*','variants.inventory_items.required_quantity','variants.inventory_items.inventory.location_levels.*'],filters:{status:'published'},pagination:{take:100}});
  const sampleCapacity=availableSets(poolFromProducts(data));
  return data.map((p:any)=>({id:p.handle,medusaId:p.id,name:p.title,description:p.description,metadata:p.metadata||{},variants:(p.variants||[]).map((v:any)=>{
    const price=v.price_set?.prices?.find((p:any)=>p.currency_code==='ron'&&!p.price_list_id);
    const stocks=(v.inventory_items||[]).map((i:any)=>Math.floor((i.inventory?.location_levels||[]).reduce((n:number,l:any)=>n+Math.max(0,Number(l.stocked_quantity)-Number(l.reserved_quantity)),0)/(i.required_quantity||1)));
    const weight=['accessory','tasting_set'].includes(p.metadata?.product_type)?0:[250,1000].includes(Number(v.weight))?Number(v.weight):/250/.test(v.title)?250:/1\s*kg|1000/i.test(v.title)?1000:0;
    return {id:v.id,sku:v.sku,weight,price:price?Number(price.amount):null,stock:p.metadata?.product_type==='tasting_set'?sampleCapacity:!v.manage_inventory||v.allow_backorder?999:stocks.length?Math.min(...stocks):0};
  }).filter((v:any)=>v.price!==null)})).filter((p:any)=>p.variants.length);
}
