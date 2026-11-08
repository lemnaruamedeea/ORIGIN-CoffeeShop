import test from 'node:test';
import assert from 'node:assert/strict';
import {aiConfig,aiReady} from '../src/lib/origin-config.ts';

test('Groq folosește cheia proprie și necesită activare explicită',async()=>{
 const keys=['AI_PROVIDER','GROQ_API_KEY','GROQ_MODEL','GROQ_LIVE_ENABLED','OPENAI_API_KEY'];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  Object.assign(process.env,{AI_PROVIDER:'groq',GROQ_API_KEY:'groq-test-only',GROQ_MODEL:'openai/gpt-oss-20b',GROQ_LIVE_ENABLED:'false',OPENAI_API_KEY:'openai-test-only'});
  const disabled=aiConfig();assert.equal(disabled.apiKey,'groq-test-only');assert.equal(disabled.model,'openai/gpt-oss-20b');assert.equal(disabled.liveEnabled,false);assert.equal(await aiReady(disabled),false);
  process.env.GROQ_LIVE_ENABLED='true';assert.equal(await aiReady(aiConfig()),true);
  process.env.AI_PROVIDER='unknown';assert.throws(()=>aiConfig(),/Furnizor AI necunoscut/);
 }finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
