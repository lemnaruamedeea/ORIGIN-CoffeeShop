import {readFileSync} from 'node:fs';
import {join} from 'node:path';
export function aiConfig(){
  let content='';try{content=readFileSync(join(process.cwd(),'.env.ai.local'),'utf8');}catch{}
  const value=(key:string)=>{const line=content.split(/\r?\n/).find(l=>l.startsWith(key+'='));const raw=line?.slice(key.length+1).trim()||'';return raw.startsWith('"')&&raw.endsWith('"')?raw.slice(1,-1):raw;};
  const chosen=process.env.AI_PROVIDER||value('AI_PROVIDER')||'openai';
  if(!['openai','ollama','gemini','groq'].includes(chosen))throw new Error('Furnizor AI necunoscut. Verifică AI_PROVIDER pe server.');
  const provider=chosen as 'openai'|'ollama'|'gemini'|'groq';
  const setting=(key:string,fallback='')=>process.env[key]||value(key)||fallback;
  const prefix=provider.toUpperCase();
  return {provider,liveEnabled:provider==='openai'||provider==='groq'?setting(prefix+'_LIVE_ENABLED')==='true':true,apiKey:provider==='ollama'?'':setting(prefix+'_API_KEY'),model:setting(prefix+'_MODEL',provider==='groq'?'openai/gpt-oss-120b':provider==='gemini'?'gemini-3.1-flash-lite':provider==='ollama'?'qwen3:1.7b':'gpt-6-luna'),baseURL:setting('OLLAMA_BASE_URL','http://127.0.0.1:11434')};
}
export async function aiReady(config:ReturnType<typeof aiConfig>){
  if(config.provider!=='ollama')return !!config.apiKey&&config.liveEnabled;
  try{const url=new URL(config.baseURL);if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))return false;const response=await fetch(new URL('/api/tags',url),{signal:AbortSignal.timeout(2500)});const data:any=await response.json();return response.ok&&Array.isArray(data.models)&&data.models.some((m:any)=>m.name===config.model);}catch{return false;}
}
