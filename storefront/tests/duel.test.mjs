import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {duelQuestions,duelArchetypes,buildDuelProfile,rankDuelCoffees,duelReasons} from '../../backend/src/lib/coffee-duel.ts';
import {cleanExperience} from '../../backend/src/lib/origin-ai.ts';
const base={aroma:'cocoa',acidity:'gentle',body:'round',drink:'black',method:'espresso',adventure:'familiar',caffeine:'regular'};
const records=JSON.parse(readFileSync(new URL('../../catalog-expanded.json',import.meta.url),'utf8'));
const coffees=records.map(c=>({id:c.handle,name:c.title,flavor:c.flavor,acidity:c.acidity,body:c.body,notes:c.notes,methods:c.methods,decaf:c.decaf,kind:c.kind,process:c.process,variants:[{stock:c.stock250},{stock:c.stock1000}]}));
export const examples=new Map();
function enumerate(index,answers){if(index===duelQuestions.length){const p=buildDuelProfile(answers);examples.set(p.archetypeId,p);return;}const q=duelQuestions[index];for(const o of q.options)enumerate(index+1,{...answers,[q.id]:o.id});}
enumerate(0,{});
test('seven rounds offer between three and eight choices, and all eleven profiles are reachable',()=>{
 assert.equal(duelQuestions.length,7);assert.equal(duelArchetypes.length,11);assert.ok(duelQuestions.every(q=>q.options.length>=3&&q.options.length<=8));assert.deepEqual(new Set(examples.keys()),new Set(duelArchetypes.map(p=>p.id)));
});
test('incomplete, unknown and malformed answers cannot complete a profile',()=>{
 assert.throws(()=>buildDuelProfile({}));assert.throws(()=>buildDuelProfile({...base,aroma:'invented'}));assert.throws(()=>buildDuelProfile({...base,caffeine:'admin'}));
});
test('combinations change archetype and preserve all actual preferences',()=>{
 assert.equal(buildDuelProfile(base).archetypeId,'cocoa-comfort');
 const creamy=buildDuelProfile({...base,body:'full',drink:'plant'});assert.equal(creamy.archetypeId,'creamy-ritual');assert.equal(creamy.drink,'plant');assert.equal(creamy.milk,true);
 const clear=buildDuelProfile({...base,body:'light',acidity:'bright',method:'v60'});assert.equal(clear.archetypeId,'clear-filter');
 assert.equal(buildDuelProfile({...base,caffeine:'decaf'}).archetypeId,'decaf-calm');
});
test('all new profile fields and every valid method survive backend sanitization',()=>{
 for(const p of examples.values())assert.deepEqual(cleanExperience({profile:p}).profile,p);
 for(const method of duelQuestions.find(q=>q.id==='method').options){const p=buildDuelProfile({...base,method:method.id});assert.equal(cleanExperience({profile:p}).profile.method,p.method);}
 const legacy={flavor:-1,acidity:1,milk:true,method:'Espresso',name:'Dulce & echilibrat'};assert.deepEqual(cleanExperience({profile:legacy}).profile,legacy);
});
test('decaf is a hard preference: no ordinary coffee is substituted when stock runs out',()=>{
 const p=buildDuelProfile({...base,caffeine:'decaf'}),ranked=rankDuelCoffees(coffees,p);assert.equal(ranked.length,1);assert.equal(ranked[0].id,'colombia-decaf');assert.ok(ranked.every(c=>c.decaf));
 assert.deepEqual(rankDuelCoffees(coffees.map(c=>c.decaf?{...c,variants:[{stock:0}]}:c),p),[]);
 assert.ok(rankDuelCoffees(coffees,buildDuelProfile(base)).every(c=>!c.decaf));
});
test('recommendations use real aroma, method and stock and exclude non-coffee products',()=>{
 const spice=buildDuelProfile({...base,aroma:'spice',body:'full'});assert.equal(rankDuelCoffees(coffees,spice)[0].id,'india-malabar');
 const extra={...coffees[0],id:'accessory',kind:'Accesoriu'},kit={...extra,id:'kit',kind:'Set degustare'};const ranked=rankDuelCoffees([...coffees,extra,kit],spice);
 assert.ok(!ranked.some(c=>['accessory','kit','kenya-kirinyaga'].includes(c.id)));assert.ok(duelReasons(ranked[0],spice).some(r=>r.includes('Condimente')));
});
test('method and actual journal ratings can change the order without changing the catalog',()=>{
 const p=buildDuelProfile({...base,method:'moka'}),a={...coffees[1],id:'a',name:'A',methods:['V60']},b={...a,id:'b',name:'B',methods:['Moka']};
 assert.equal(rankDuelCoffees([a,b],p)[0].id,'b');
 const same=[{...a,methods:['Moka']},b];assert.equal(rankDuelCoffees(same,p,[{coffeeId:'a',rating:1},{coffeeId:'b',rating:5}])[0].id,'b');assert.equal(same[0].id,'a');
});
test('preference schema does not persist arbitrary fields or invalid answer identifiers',()=>{
 const p=buildDuelProfile(base),saved=cleanExperience({profile:{...p,role:'admin',answers:{...p.answers,extra:'secret'}}}).profile;assert.ok(!('role' in saved));assert.ok(!('extra' in saved.answers));
 assert.equal(cleanExperience({profile:{...p,answers:{...p.answers,method:'invented'}}}).profile.version,undefined);
});
