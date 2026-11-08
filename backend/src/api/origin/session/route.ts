import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {allowOrigin,fail,session} from '../../../lib/origin-store';
import {cleanExperience,OriginError} from '../../../lib/origin-ai';
import {revision} from '../../../lib/origin-accounts';
export async function GET(req:MedusaRequest,res:MedusaResponse){try{allowOrigin(req);res.setHeader('Cache-Control','no-store');const s=await session(req,res);res.json({data:s.data,owner:s.id,revision:s.revision,customer:s.customer});}catch(e){fail(res,e);}}
export async function PUT(req:MedusaRequest,res:MedusaResponse){try{
 allowOrigin(req);const s=await session(req,res),body=req.body as any;
 if(body?.owner!==s.id)throw new OriginError(409,'owner_changed','Contul activ s-a schimbat. Reîncarcă datele înainte de salvare.');
 const data=cleanExperience(body.data);
 if(!s.customer&&data.entries.length)throw new OriginError(401,'login_required','Autentifică-te pentru a salva degustările în jurnalul personal.');
 const next=await s.db.transaction(async(trx:any)=>{
  const row=await trx('origin_experience').where({id:s.id}).forUpdate().first();
  if(body.revision!==revision(row))throw new OriginError(409,'revision_conflict','Jurnalul a fost modificat în altă fereastră. Reîncarcă datele înainte de a continua.');
  const updated=new Date(Math.max(Date.now(),row?new Date(row.updated_at).getTime()+1:0));
  if(row)await trx('origin_experience').where({id:s.id}).update({data:JSON.stringify(data),updated_at:updated});
  else {const created=await trx('origin_experience').insert({id:s.id,data:JSON.stringify(data),updated_at:updated}).onConflict('id').ignore().returning('id');if(!created.length)throw new OriginError(409,'revision_conflict','Datele au fost modificate. Reîncarcă înainte de salvare.');}
  return updated.toISOString();
 });
 res.setHeader('Cache-Control','no-store');res.json({saved:true,revision:next});
}catch(e){fail(res,e);}}
