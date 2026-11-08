import test from 'node:test';
import assert from 'node:assert/strict';
import {coffees,recommend,brewFeedback,defaultBrew,demoReply} from '../src/domain.ts';

const profile={flavor:-1,acidity:1,milk:true,method:'Espresso',name:'Dulce & echilibrat'};
test('profilurile distincte produc recomandări diferite din catalog',()=>{
  assert.equal(recommend(profile)[0].id,'brazil-santos');
  assert.equal(recommend({...profile,flavor:1,acidity:3,milk:false,method:'V60'})[0].id,'ethiopia-guji');
  assert.deepEqual(new Set(recommend(profile).map(c=>c.id)),new Set(coffees.map(c=>c.id)));
});
test('feedbackul real poate schimba ordinea recomandărilor',()=>{
  const neutral={...profile,flavor:0,acidity:2,milk:false,method:'V60'};
  const entries=[{...defaultBrew,coffeeId:'colombia-huila',id:'test',rating:1,date:'2026-10-30',taste:'Prea acidă',note:''},{...defaultBrew,coffeeId:'ethiopia-guji',id:'test2',rating:5,date:'2026-10-30',taste:'Echilibrată',note:''}];
  assert.equal(recommend(neutral)[0].id,'colombia-huila');
  assert.equal(recommend(neutral,entries)[0].id,'ethiopia-guji');
});
test('explorarea începe fără un răspuns rezolvat, iar indicatorul rămâne în interval',()=>{
  assert.equal(brewFeedback({...defaultBrew,temperature:85,grind:85}).tone,'under');
  assert.notEqual(brewFeedback(defaultBrew).tone,'balanced');
  for(const temperature of [80,100])for(const grind of [0,100])for(const ratio of [12,20]){
    const f=brewFeedback({...defaultBrew,temperature,grind,ratio});
    assert.ok(f.position>=0&&f.position<=100);
  }
});
test('asistentul distinge jurnalul gol și folosește ultima înregistrare',()=>{
  assert.match(demoReply('Ce am notat în jurnal?',[],defaultBrew,null),/încă gol/);
  const entry={...defaultBrew,id:'test',date:'2026-10-30',rating:4,taste:'Echilibrată',note:'Caramel și cacao'};
  const reply=demoReply('Ce am notat în jurnal?',[entry],defaultBrew,null);
  assert.match(reply,/20 g/);assert.match(reply,/Caramel și cacao/);
});
