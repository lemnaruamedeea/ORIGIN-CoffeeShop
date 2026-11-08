import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coffeeBrewProfiles,brewProfile,brewReference,evaluateBrew,challengeBrew,brewTime} from '../../backend/src/lib/coffee-brewing.ts';
const coffees=JSON.parse(readFileSync(new URL('../../catalog-expanded.json',import.meta.url),'utf8')).map(c=>({id:c.handle,name:c.title,roast:c.roast,process:c.process}));
test('toate cele 18 cafele au rețete distincte de referință',()=>{
 assert.equal(coffees.length,18);for(const c of coffees)assert.ok(coffeeBrewProfiles[c.id]);
 assert.equal(new Set(coffees.map(c=>{const r=brewReference(c);return [r.dose,r.temperature,r.ratio,r.grind].join(':');})).size,coffees.length);
});
test('rețeta fiecărui lot ajunge în propriul echilibru',()=>{for(const c of coffees){const f=evaluateBrew(brewReference(c),c);assert.equal(f.tone,'balanced',c.id);assert.equal(f.position,50);assert.ok(f.parameters.every(p=>p.inRange));}});
test('o rețetă comună nu echilibrează toate cafelele',()=>{
 const recipe=brewReference(coffees[0]);assert.ok(coffees.filter(c=>evaluateBrew({...recipe,coffeeId:c.id},c).tone==='balanced').length<coffees.length);
 const brazil=coffees.find(c=>c.id==='brazil-santos');assert.notEqual(evaluateBrew({...recipe,coffeeId:brazil.id},brazil).tone,'balanced');
});
test('valorile extreme nu se compensează artificial',()=>{
 const c=coffees[0];assert.notEqual(evaluateBrew({coffeeId:c.id,dose:20,temperature:85,ratio:16,grind:4},c).tone,'balanced');
 assert.notEqual(evaluateBrew({coffeeId:c.id,dose:20,temperature:100,ratio:17.75,grind:100},c).tone,'balanced');
});
test('fiecare parametru trebuie să respecte propriul interval',()=>{
 const c=coffees[0],r=brewReference(c);
 for(const change of [{temperature:r.temperature+1.6},{ratio:r.ratio+.5},{grind:r.grind+5}])assert.notEqual(evaluateBrew({...r,...change},c).tone,'balanced');
 assert.equal(evaluateBrew({...r,temperature:r.temperature+1.5,ratio:r.ratio+.4,grind:r.grind+4},c).tone,'balanced');
});
test('doza scalează măcinătura, apa și timpul fără să schimbe profilul lotului',()=>{
 for(const c of coffees)for(const dose of [12,20,30]){const r=brewReference(c,dose);assert.equal(r.dose,dose);assert.equal(r.temperature,brewProfile(c).temperature);assert.equal(r.ratio,brewProfile(c).ratio);assert.equal(evaluateBrew(r,c).tone,'balanced');assert.ok(brewTime(c,dose)>0);}
 const c=coffees[0];assert.ok(brewReference(c,30).grind>brewReference(c,12).grind);
});
test('provocarea pornește dezechilibrată pentru fiecare cafea și poate fi rezolvată',()=>{
 for(const c of coffees){assert.equal(evaluateBrew(challengeBrew(c),c).tone,'under');assert.equal(evaluateBrew(brewReference(c),c).tone,'balanced');}
 assert.notDeepEqual(challengeBrew(coffees[0]),challengeBrew(coffees[1]));
});
test('cafelele noi primesc un reper după prăjire, fără a altera rețetele existente',()=>{
 assert.notEqual(brewProfile({id:'new-light',roast:'Light'}).temperature,brewProfile({id:'new-dark',roast:'Dark'}).temperature);
 const c=coffees[0],before=brewProfile(c);brewProfile(c).temperature=0;assert.deepEqual(brewProfile(c),before);
});
test('handle-urile care coincid cu nume de proprietăți primesc un reper valid',()=>{
 for(const id of ['constructor','__proto__','toString']){const c={id,roast:'Medium'},r=brewReference(c);assert.ok(Number.isFinite(r.temperature));assert.equal(evaluateBrew(r,c).tone,'balanced');}
});
