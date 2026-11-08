import type {AuthenticatedMedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
export async function GET(req:AuthenticatedMedusaRequest,res:MedusaResponse){
 res.setHeader('Cache-Control','no-store');if(!req.auth_context?.actor_id)return res.status(401).json({message:'Authentication required'});
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(req.params.id))return res.status(404).json({message:'Order missing'});
 const db:any=req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 const rows=await db('origin_mystery_samples').where({order_id:req.params.id}).orderBy('set_index').orderBy('slot');
 const mail=await db('origin_mail_outbox').where({order_id:req.params.id}).first();
 res.json({samples:rows.map((s:any)=>({setIndex:s.set_index,slot:s.slot,code:s.code,coffee:s.snapshot.name,coffeeId:s.coffee_handle})),mailStatus:mail?.status||null});
}
