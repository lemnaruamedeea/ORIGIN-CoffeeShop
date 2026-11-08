import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeExploration,neutralBrew,waterFor,emptyFlow,advanceFlow,explorationFeedback,brewFilters} from '../../backend/src/lib/brew-exploration.ts';
import {coffeeBrewProfiles} from '../../backend/src/lib/coffee-brewing.ts';
import {cleanExperience,baristaInstructions} from '../../backend/src/lib/origin-ai.ts';
const run=(b)=>{let s=emptyFlow();for(let i=0;i<3000&&!s.done;i++){s=advanceFlow(s,b,1);assert.ok(s.bed>=0&&s.drained>=0);assert.ok(Math.abs(s.poured-s.drained-s.absorbed-s.bed)<1e-7);assert.ok(s.poured<=waterFor(b)+1e-6);}assert.ok(s.done);return s;};
test('water changes in single grams and independently determines the ratio',()=>{
 const b={...neutralBrew('ethiopia-guji'),water:300,ratio:15};assert.equal(normalizeExploration({...b,water:301}).ratio,15.05);assert.equal(normalizeExploration({...b,water:299}).ratio,14.95);assert.equal(normalizeExploration({...b,dose:25,water:301}).ratio,12.04);
});
test('zero, one gram, high water values and old journal recipes are handled',()=>{
 const b={...neutralBrew('ethiopia-guji'),water:300,ratio:15};assert.equal(normalizeExploration({...b,water:-10}).water,0);assert.equal(normalizeExploration({...b,water:9000}).water,1500);assert.equal(waterFor({...b,water:undefined,ratio:16.5}),330);assert.equal(run({...b,water:1}).poured,1);assert.equal(run({...b,water:1500}).poured,1500);
});
test('each filter finishes without creating or losing water',()=>{
 const b={...neutralBrew('ethiopia-guji'),water:300,ratio:15};for(const f of brewFilters){const result=run({...b,filter:f.id});assert.equal(result.absorbed,40);assert.equal(result.drained,260);assert.equal(result.bed,0);}
});
test('filter choice and grind affect the simulated drainage time',()=>{
 const b={...neutralBrew('ethiopia-guji'),water:300,ratio:15};assert.ok(run({...b,filter:'dense-paper'}).elapsed>run({...b,filter:'metal'}).elapsed);assert.ok(run({...b,grind:10}).elapsed>run({...b,grind:80}).elapsed);
});
test('coffee-specific feedback gives directions without revealing target values',()=>{
 const b={...neutralBrew('ethiopia-guji'),water:300,ratio:15};const result=explorationFeedback(b,coffeeBrewProfiles[b.coffeeId]);assert.equal(result.tone,'under');assert.ok(!('target' in result));assert.ok(!('parameters' in result));assert.ok(!/\d/.test(result.text));assert.notEqual(explorationFeedback(b,coffeeBrewProfiles['ethiopia-guji']).text,explorationFeedback(b,coffeeBrewProfiles['brazil-santos']).text);
});
test('one combination does not balance all filters, and each coffee has a reachable zone',()=>{
 for(const [id,p] of Object.entries(coffeeBrewProfiles)){const b=normalizeExploration({...neutralBrew(id),dose:p.dose,water:Math.round(p.dose*p.ratio),temperature:p.temperature,grind:p.grind});assert.equal(explorationFeedback(b,p).tone,'balanced');assert.notEqual(explorationFeedback({...b,filter:'metal'},p).tone,'balanced');}
});
test('journal persistence preserves chosen filter and water and recomputes a forged ratio',()=>{
 const entry={...neutralBrew('ethiopia-guji'),water:301,ratio:99,filter:'metal',id:'t',date:'2026-11-08',rating:4,taste:'Dulce',note:''};
 const saved=cleanExperience({entries:[entry]}).entries[0];assert.equal(saved.water,301);assert.equal(saved.filter,'metal');assert.equal(saved.ratio,15.05);
 assert.equal(cleanExperience({entries:[{...entry,filter:'forged',water:-5}]}).entries[0].filter,'paper');
 assert.match(baristaInstructions,/recipe trebuie să fie null/);assert.ok(!baristaInstructions.includes('brewingReference'));
});
