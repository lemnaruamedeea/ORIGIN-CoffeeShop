import {createHmac,timingSafeEqual} from 'node:crypto';
import nodemailer from 'nodemailer';
const json=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
export function createMailHandler(transportFactory=nodemailer.createTransport){return async function(event){
 if(event.httpMethod!=='POST')return json(405,{error:'method_not_allowed'});
 const secret=process.env.MAIL_RELAY_SECRET||'',timestamp=event.headers?.['x-origin-mail-timestamp']||'',signature=event.headers?.['x-origin-mail-signature']||'',body=event.body||'';
 if(secret.length<32)return json(503,{error:'mail_not_configured'});
 const expected=createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex');
 if(!/^\d+$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>300000||!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(expected),Buffer.from(signature)))return json(401,{error:'unauthorized'});
 try{const m=JSON.parse(body),user=process.env.SMTP_USER,pass=process.env.SMTP_PASSWORD?.replace(/\s/g,'');if(!user||!pass)return json(503,{error:'mail_not_configured'});
 const transport=transportFactory({host:process.env.SMTP_HOST||'smtp.gmail.com',port:465,secure:true,auth:{user,pass},connectionTimeout:12000,socketTimeout:20000,logger:false,debug:false});
 if(m.verify===true){await transport.verify();return json(200,{verified:true});}
 if(typeof m.to!=='string'||!/^\S+@\S+\.\S+$/.test(m.to)||/[\r\n]/.test(m.to)||/\.(local|test|invalid|example)$/i.test(m.to)||typeof m.subject!=='string'||m.subject.length>200||/[\r\n]/.test(m.subject)||typeof m.text!=='string'||m.text.length>100000)return json(400,{error:'invalid_message'});
 const result=await transport.sendMail({from:{name:'ORIGIN Coffee',address:user},to:m.to,subject:m.subject,text:m.text,...(typeof m.messageId==='string'&&/^<[a-zA-Z0-9@._-]{1,190}>$/.test(m.messageId)?{messageId:m.messageId}:{}),disableFileAccess:true,disableUrlAccess:true});
 return json(200,{accepted:result.accepted});
 }catch{return json(502,{error:'mail_delivery_failed'});}
};
}
export const handler=createMailHandler();
