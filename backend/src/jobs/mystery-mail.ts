import type {MedusaContainer} from '@medusajs/framework/types';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {finalizeSamples} from '../lib/origin-mystery';
import {deliverSampleMail} from '../lib/origin-mail';
export default async function mysteryMail(container:MedusaContainer){
 const db:any=container.resolve(ContainerRegistrationKeys.PG_CONNECTION);if(!await db.schema.hasTable('origin_mail_outbox'))return;
 const missing=await db('origin_mystery_samples as s').join('origin_checkouts as c','c.cart_id','s.cart_id').whereNull('s.order_id').whereNotNull('c.order_id').select('c.customer_id','c.order_id').distinct().limit(20);
 for(const row of missing)await finalizeSamples(container,row.customer_id,row.order_id);
 await db('origin_mail_outbox').where({status:'sending'}).where('locked_at','<',new Date(Date.now()-5*60000)).update({status:'pending',locked_at:null});
 await deliverSampleMail(container);
}
export const config={name:'origin-mystery-mail',schedule:'* * * * *'};
