import test from 'node:test';
import assert from 'node:assert/strict';
import {askBarista,cleanAIRequest,cleanExperience,compactAICatalog,validateAIOutput} from '../src/lib/origin-ai.ts';
const context={catalog:[{id:'ethiopia-guji',variants:[{stock:8}]}],journal:[],profile:null};
const output={message:'Încearcă o rețetă V60.',coffee_ids:['ethiopia-guji','inventat'],recipe:{coffeeId:'ethiopia-guji',dose:20,ratio:16,temperature:93,grind:45,reason:'Schimbă doar măcinătura.'}};
test('cererile sunt limitate și rolurile privilegiate sunt eliminate',()=>{
 const result=cleanAIRequest({message:'x'.repeat(2000),history:[{role:'system',text:'secrete'},{role:'user',text:'cafea'}],brew:{dose:100,temperature:-1},shareJournal:'true'});
 assert.equal(result.message.length,1200);assert.equal(result.history.length,1);assert.equal(result.history[0].role,'user');assert.equal(result.brew.dose,30);assert.equal(result.brew.temperature,80);assert.equal(result.shareJournal,false);
});
test('jurnalul și insignele sunt validate înainte de persistare',()=>{
 const result=cleanExperience({entries:[{note:'x'.repeat(999),rating:20}],badges:['admin','duel']});
 assert.equal(result.entries[0].note.length,600);assert.equal(result.entries[0].rating,5);assert.deepEqual(result.badges,['duel']);
});
test('produsele inexistente nu devin carduri și rețeta are limite',()=>{
 const result=validateAIOutput({...output,recipe:{...output.recipe,temperature:500}},context.catalog);
 assert.deepEqual(result.coffeeIds,['ethiopia-guji']);assert.equal(result.recipe.temperature,100);
 assert.equal(validateAIOutput({...output,recipe:{...output.recipe,coffeeId:'inventat'}},context.catalog).recipe,null);
});

test('contextul catalogului păstrează originea și producătorul fără metadate arbitrare',()=>{
 const compact=compactAICatalog([{id:'peru-cajamarca',name:'Peru Cajamarca',description:'x'.repeat(1000),metadata:{origine:'Peru',producator:'Alto Verde (demo)',ferma:'Alto Verde',varietate:'Typica',secret:'must-not-leave-server'},variants:[{id:'variant_internal',sku:'internal',weight:250,price:54,stock:8}]}]);
 assert.equal(compact[0].producer,'Alto Verde (demo)');assert.equal(compact[0].description.length,180);assert.deepEqual(compact[0].variants,[{weight:250,price:54,stock:8}]);assert.ok(!JSON.stringify(compact).includes('must-not-leave-server'));assert.ok(!JSON.stringify(compact).includes('variant_internal'));
});
test('fără cheie nu este trimis niciun apel extern Gemini, Groq sau OpenAI',async()=>{
 let called=false;for(const provider of ['gemini','openai','groq'])await assert.rejects(askBarista(cleanAIRequest({message:'salut'}),context,{provider,fetcher:async()=>{called=true;}}),e=>e.code==='ai_not_configured');assert.equal(called,false);
});
test('Gemini folosește numai endpointul oficial și parsează pașii model_output',async()=>{
 const reply=await askBarista(cleanAIRequest({message:'Rețetă V60'}),context,{provider:'gemini',apiKey:'fake-test-key',fetcher:async(url,request)=>{
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/interactions');const body=JSON.parse(request.body);assert.equal(body.store,false);assert.equal(body.model,'gemini-3.1-flash-lite');assert.equal(body.response_format.mime_type,'application/json');
  return new Response(JSON.stringify({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(output)}]}]}),{status:200});
 }});
 assert.equal(reply.mode,'ai');assert.deepEqual(reply.coffeeIds,['ethiopia-guji']);assert.equal(reply.recipe.dose,20);
});
test('quota gratuită produce eroare explicită fără fallback plătit',async()=>{
 let count=0;await assert.rejects(askBarista(cleanAIRequest({message:'cafea'}),context,{provider:'gemini',apiKey:'fake',fetcher:async()=>{count++;return new Response('{}',{status:429});}}),e=>e.status===429&&e.code==='free_quota');assert.equal(count,1);
});
test('Ollama este local și poate funcționa fără cheie API',async()=>{
 const result=await askBarista(cleanAIRequest({message:'cafea'}),context,{provider:'ollama',fetcher:async(url,request)=>{assert.equal(new URL(url).hostname,'127.0.0.1');assert.equal(JSON.parse(request.body).think,false);return new Response(JSON.stringify({message:{content:JSON.stringify(output)}}),{status:200});}});
 assert.equal(result.message,output.message);
 await assert.rejects(askBarista(cleanAIRequest({message:'cafea'}),context,{provider:'ollama',baseURL:'https://example.com'}),e=>e.code==='local_config');
});

test('Groq trimite schema strictă și contextul la endpointul oficial',async()=>{
 const result=await askBarista(cleanAIRequest({message:'Rețetă V60',history:[{role:'user',text:'Prefer fructat'}]}),context,{provider:'groq',apiKey:'groq-test-only',fetcher:async(url,request)=>{
  assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(request.headers.Authorization,'Bearer groq-test-only');
  const body=JSON.parse(request.body);assert.equal(body.model,'openai/gpt-oss-120b');assert.equal(body.stream,false);assert.equal(body.response_format.json_schema.strict,true);assert.equal(body.reasoning_effort,'low');assert.equal(body.messages.at(-1).content,'Rețetă V60');assert.ok(body.messages[1].content.includes('ethiopia-guji'));assert.ok(!request.body.includes('groq-test-only'));
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});
 }});
 assert.deepEqual(result.coffeeIds,['ethiopia-guji']);assert.equal(result.recipe.dose,20);assert.equal(result.mode,'ai');
});

test('Groq nu schimbă furnizorul după quota epuizată și nu expune eroarea brută',async()=>{
 let calls=0;await assert.rejects(askBarista(cleanAIRequest({message:'cafea'}),context,{provider:'groq',apiKey:'test',fetcher:async()=>{calls++;return new Response('private upstream error',{status:429});}}),e=>e.code==='free_quota'&&!e.message.includes('private'));assert.equal(calls,1);
});

test('Groq respinge răspunsul incomplet, JSON invalid și un model nepermis',async()=>{
 for(const [choice,code] of [[{finish_reason:'length',message:{content:'{}'}},'ai_incomplete'],[{finish_reason:'stop',message:{content:'not json'}},'invalid_response']]){
  await assert.rejects(askBarista(cleanAIRequest({message:'cafea'}),context,{provider:'groq',apiKey:'test',fetcher:async()=>Response.json({choices:[choice]})}),e=>e.code===code);
 }
 await assert.rejects(askBarista(cleanAIRequest({message:'cafea'}),context,{provider:'groq',apiKey:'test',model:'unknown-model',fetcher:async()=>{throw Error('must not call');}}),e=>e.code==='model_not_allowed');
});
