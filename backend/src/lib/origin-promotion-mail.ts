import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {ensureTastingReward} from './origin-promotions';
import {mailConfig,mailTransport} from './origin-mail';
export function tastingRewardMessage(reward:any,url:string){
 const date=new Intl.DateTimeFormat('ro-RO',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Bucharest'}).format(new Date(reward.expires_at));
 return {subject:'ORIGIN — continuă descoperirea cu 15% reducere',text:[
  'De la mostră la cafeaua preferată.','',
  'Mulțumim că ai ales Mystery Tasting! Ai 15% reducere la un singur pachet de 250 g din cafelele setului tău achitat.',
  '',`Codul tău personal: ${reward.code}`,`Valabil până la ${date} (ora României).`,'',
  'Dezvăluie mostrele în Pașaport, apoi adaugă cafeaua preferată în coș și introdu codul înainte de plată.',
  'Folosește aceeași adresă de e-mail ca la comanda setului. Codul poate fi utilizat o singură dată; dacă ai mai multe pachete eligibile, reducerea se aplică celui cu prețul cel mai mic.',
  'Nu se cumulează cu PRIMAORIGINE. Poate fi combinat cu transportul standard gratuit de la 180 lei după reducerea produselor.',
  '',url.replace(/\/$/,'')+'/#passport','','ORIGIN Coffee'
 ].join('\n')};
}
export async function processTastingRewards(scope:any,orderId?:string){
 const db=scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);if(!await db.schema.hasTable('origin_tasting_rewards'))return;
 const candidates=db('origin_mystery_samples as s').leftJoin('origin_tasting_rewards as r','r.order_id','s.order_id').whereNotNull('s.order_id').whereNull('r.order_id').select('s.order_id').groupBy('s.order_id').orderByRaw('min(s.reward_checked_at) asc nulls first').limit(30);if(orderId)candidates.where('s.order_id',orderId);
 for(const c of await candidates){await db('origin_mystery_samples').where({order_id:c.order_id}).update({reward_checked_at:new Date()});await ensureTastingReward(scope,c.order_id);}
 // Retry provisioning after an interrupted native promotion workflow.
 for(const r of await db('origin_tasting_rewards').whereNull('promotion_id').limit(10))await ensureTastingReward(scope,r.order_id);
 if(!mailConfig().configured)return;
 await db('origin_tasting_rewards').where({mail_status:'sending'}).where('locked_at','<',new Date(Date.now()-300000)).update({mail_status:'pending',locked_at:null});
 const pending=db('origin_tasting_rewards').whereIn('mail_status',['pending','failed']).whereNotNull('promotion_id').where('attempts','<',6).where('expires_at','>',new Date()).where((b:any)=>b.whereNull('next_attempt_at').orWhere('next_attempt_at','<=',new Date()));if(orderId)pending.where({order_id:orderId});
 for(const r of await pending.orderBy('created_at').limit(10)){
  if(!(await db('origin_tasting_rewards').where({order_id:r.order_id}).whereIn('mail_status',['pending','failed']).update({mail_status:'sending',locked_at:new Date(),attempts:db.raw('attempts + 1')}).returning('order_id')).length)continue;
  try{
   const {data}=await scope.resolve(ContainerRegistrationKeys.QUERY).graph({entity:'order',fields:['id','status','payment_collections.status'],filters:{id:r.order_id}});
   if(!data[0]||data[0].status==='canceled'){await db('origin_tasting_rewards').where({order_id:r.order_id}).update({mail_status:'canceled',locked_at:null});continue;}
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)||/\.(local|test|invalid|example)$/i.test(r.email))throw Error('Recipient not deliverable');
   const cfg=mailConfig(),result=await mailTransport().sendMail({from:{name:'ORIGIN Coffee',address:cfg.from},to:r.email,...tastingRewardMessage(r,cfg.url),messageId:`<tasting-reward-${r.order_id}@${cfg.from.split('@')[1]}>`,disableFileAccess:true,disableUrlAccess:true});
   if(!result.accepted?.some((e:any)=>String(e).toLowerCase()===r.email))throw Error('Mail not accepted');
   await db('origin_tasting_rewards').where({order_id:r.order_id}).update({mail_status:'sent',sent_at:new Date(),locked_at:null});
  }catch{await db('origin_tasting_rewards').where({order_id:r.order_id}).update({mail_status:'failed',locked_at:null,next_attempt_at:new Date(Date.now()+Math.min(60,2**Number(r.attempts))*60000)});}
 }
}
