import {createHmac} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import nodemailer from 'nodemailer';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
export function mailConfig(){
 const local:Record<string,string>={},path=resolve(process.cwd(),'.env.mail.local');
 if(existsSync(path))for(const line of readFileSync(path,'utf8').split(/\r?\n/)){const m=line.match(/^(SMTP_HOST|SMTP_PORT|SMTP_SECURE|SMTP_USER|SMTP_PASSWORD|MAIL_FROM|PUBLIC_STORE_URL)=(.*)$/);if(m)local[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
 const get=(key:string)=>process.env[key]||local[key]||'';
 const host=get('SMTP_HOST'),user=get('SMTP_USER'),pass=get('SMTP_PASSWORD').replace(/\s/g,''),from=get('MAIL_FROM')||user,port=Number(get('SMTP_PORT')||465),secure=get('SMTP_SECURE')!=='false';
 const relayUrl=get('MAIL_RELAY_URL'),relaySecret=get('MAIL_RELAY_SECRET');
 return {relayUrl,relaySecret,host,port,secure,user,pass,from,url:get('PUBLIC_STORE_URL')||'http://localhost:5173',configured:(/^https:\/\//.test(relayUrl)&&relaySecret.length>=32)||!!host&&!!user&&!!pass&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)};
}
export function mailTransport(){const c=mailConfig();if(!c.configured)throw Error('Mail configuration missing');
 if(c.relayUrl){const send=async(message:any)=>{const body=JSON.stringify(message),timestamp=String(Date.now()),signature=createHmac('sha256',c.relaySecret).update(timestamp+'.'+body).digest('hex');const r=await fetch(c.relayUrl,{method:'POST',headers:{'Content-Type':'application/json','x-origin-mail-timestamp':timestamp,'x-origin-mail-signature':signature},body,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Mail relay unavailable');return r.json() as Promise<any>;};return {sendMail:send,verify:async()=>!!(await send({verify:true})).verified};}
 return nodemailer.createTransport({host:c.host,port:c.port,secure:c.secure,requireTLS:!c.secure,auth:{user:c.user,pass:c.pass},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:25000,logger:false,debug:false});}
export function sampleEmail(subject:string,samples:{set_index:number;slot:number;code:string}[],url:string){
 const lines=[subject,'','Mulțumim că ai ales Mystery Tasting.','Fiecare set conține trei cafele distincte, alese aleatoriu, în mostre de 30 g.',''];
 for(const s of [...samples].sort((a,b)=>a.set_index-b.set_index||a.slot-b.slot))lines.push(`Set ${s.set_index} · Mostra ${String.fromCharCode(64+s.slot)} · 30 g · Cod: ${s.code}`);
 lines.push('','Păstrează ordinea A / B / C de pe etichetele mostrelor.','Prepară cafeaua, notează impresia, apoi introdu codul în Pașaport pentru a afla originea.',url.replace(/\/$/,'')+'/#passport','','Codurile sunt personale. Folosește contul sau sesiunea privată din care ai plasat comanda pentru a le dezvălui.','ORIGIN Coffee');return lines.join('\n');
}
export async function deliverSampleMail(scope:any,orderId?:string){
 const db:any=scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);if(!mailConfig().configured)return;
 const pending=db('origin_mail_outbox').whereIn('status',['pending','failed']).where('attempts','<',6).where(b=>b.whereNull('next_attempt_at').orWhere('next_attempt_at','<=',new Date()));if(orderId)pending.where({order_id:orderId});
 const rows=await pending.orderBy('created_at').limit(10);
 for(const row of rows){
  const claimed=await db('origin_mail_outbox').where({id:row.id}).whereIn('status',['pending','failed']).update({status:'sending',locked_at:new Date(),attempts:db.raw('attempts + 1')}).returning('id');if(!claimed.length)continue;
  try{
   const {data}=await scope.resolve(ContainerRegistrationKeys.QUERY).graph({entity:'order',fields:['id','email','customer_id','status'],filters:{id:row.order_id}});
   if(!data[0]||data[0].status==='canceled'){await db('origin_mail_outbox').where({id:row.id}).update({status:'canceled'});continue;}
   // Recipient is always the native order's email, never a browser-supplied address or the admin sender.
   const to=data[0].email;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||/\.(local|test)$/i.test(to))throw Error('Recipient not deliverable');
   const samples=await db('origin_mystery_samples').where({order_id:row.order_id,customer_id:data[0].customer_id});if(!samples.length)throw Error('Samples missing');
   const cfg=mailConfig();const result=await mailTransport().sendMail({from:{name:'ORIGIN Coffee',address:cfg.from},to,subject:row.subject,text:sampleEmail(row.subject,samples,cfg.url),messageId:`<mystery-${row.order_id}@${cfg.from.split('@')[1]}>`,disableFileAccess:true,disableUrlAccess:true});
   if(!result.accepted?.length)throw Error('Mail not accepted');
   await db('origin_mail_outbox').where({id:row.id}).update({recipient:to,status:'sent',sent_at:new Date(),last_error:null,locked_at:null});
  }catch{await db('origin_mail_outbox').where({id:row.id}).update({status:'failed',last_error:'Trimiterea nu a fost confirmată de serviciul e-mail.',locked_at:null,next_attempt_at:new Date(Date.now()+Math.min(60,2**Number(row.attempts))*60000)});}
 }
}
