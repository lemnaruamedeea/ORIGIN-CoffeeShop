import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {askBarista,cleanAIRequest,compactAICatalog,OriginError} from '../../../lib/origin-ai';
import {allowOrigin,catalog,fail,limitAI,session} from '../../../lib/origin-store';
import {brewFilters} from '../../../lib/brew-exploration';
import {aiConfig} from '../../../lib/origin-config';
import {publicCatalog} from '../../../lib/origin-public-catalog';

export async function POST(req:MedusaRequest,res:MedusaResponse){try{
  allowOrigin(req);const input=cleanAIRequest(req.body),s=await session(req,res);if(input.shareJournal&&!s.customer)throw new OriginError(401,'login_required','Autentifică-te pentru a include jurnalul personal.');
  const ai=aiConfig();if(ai.provider!=='ollama'&&!ai.apiKey)throw new OriginError(503,'ai_not_configured',`Configurează cheia ${ai.provider==='groq'?'Groq':ai.provider==='gemini'?'Gemini':'OpenAI'} în backend pentru a activa AI Barista.`);
  if(!ai.liveEnabled)throw new OriginError(503,'ai_live_disabled','Barista nu este disponibil momentan. Încearcă din nou mai târziu.');
  limitAI(req);
  const products=compactAICatalog(publicCatalog(await catalog(req.scope)));
  const descriptor=(p:any)=>({id:p.id,name:p.name,roast:p.roast,process:p.process});
  const active=products.find((p:any)=>p.id===input.brew.coffeeId);
  if(!active)throw new OriginError(400,'invalid_coffee','Alege o cafea disponibilă în catalog.');
  const context={filters:brewFilters.map(f=>({id:f.id,name:f.name,description:f.description})),catalog:products,profile:s.data?.profile||null,discoveryMode:true,activeRecipe:{...input.brew,method:'Pour-over / filtru manual'},journal:input.shareJournal&&s.customer?(s.data?.entries||[]).slice(0,3).map((entry:any)=>({...entry,note:entry.note.slice(0,250)})):[],scope:'Nu furniza valori-țintă sau o rețetă completă. Oferă indicii calitative pentru explorare, pe baza setărilor clientului și a gustului descris. recipe=null. Comenzile se plasează din coș și necesită autentificare.'};
  const reply=await askBarista(input,context,ai);res.setHeader('Cache-Control','no-store');res.json({...reply,recipe:null});
}catch(e:any){
 if(e?.name==='TimeoutError'||e?.name==='AbortError')fail(res,new OriginError(504,'ai_timeout','Barista nu a răspuns la timp. Încearcă din nou.'));
 else if(e instanceof OriginError&&e.code==='free_quota')fail(res,new OriginError(429,e.code,'Barista primește multe solicitări. Încearcă din nou puțin mai târziu.'));
 else if(e instanceof OriginError&&e.status>=500)fail(res,new OriginError(e.status,e.code,'Barista nu poate răspunde momentan. Încearcă din nou mai târziu.'));
 else fail(res,e);
}}
