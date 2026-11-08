import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {checkoutCustomer,checkoutFail,getOrder} from '../../../../../../lib/origin-checkout';
import {deliverSampleMail,mailConfig} from '../../../../../../lib/origin-mail';
import {OriginError} from '../../../../../../lib/origin-ai';
export async function POST(req:MedusaRequest,res:MedusaResponse){try{
 const c=await checkoutCustomer(req,res,true);await getOrder(req,c.id,req.params.id);
 if(!mailConfig().configured)throw new OriginError(503,'mail_unavailable','Trimiterea e-mailurilor nu este disponibilă momentan. Codurile rămân în cont.');
 const db:any=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION),row=await db('origin_mail_outbox').where({order_id:req.params.id}).first();
 if(!row)throw new OriginError(404,'samples_missing','Comanda nu conține mostre.');
 if(row.locked_at&&Date.now()-new Date(row.locked_at).getTime()<60000||row.sent_at&&Date.now()-new Date(row.sent_at).getTime()<60000)throw new OriginError(429,'mail_wait','Așteaptă un minut înainte să retrimiți codurile.');
 await db('origin_mail_outbox').where({id:row.id}).whereNot('status','sending').update({status:'pending',attempts:0,next_attempt_at:null});
 await deliverSampleMail(req.scope,req.params.id);const next=await db('origin_mail_outbox').where({id:row.id}).first();res.json({sent:next.status==='sent'});
}catch(e){checkoutFail(res,e);}}
