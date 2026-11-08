import test from 'node:test';
import assert from 'node:assert/strict';
import {achievements,journalAchievements} from '../src/achievements.ts';
import {cleanExperience} from '../../backend/src/lib/origin-ai.ts';
const coffees=[
 {id:'a',countryCode:'ET'}, {id:'b',countryCode:'ET'}, {id:'c',countryCode:'BR'},
 {id:'d',countryCode:'CO',decaf:true}, {id:'e',countryCode:'BI'},
 {id:'f',countryCode:'MX'}, {id:'g',countryCode:'IN'},
 {id:'blend',countryCode:'MIX',kind:'Blend'},
];
const entry=(coffeeId,extra={})=>({coffeeId,id:crypto.randomUUID(),date:new Date().toISOString(),dose:20,ratio:16,temperature:93,grind:50,rating:4,taste:'Dulce',note:'',...extra});
test('all twelve distinct badges survive server cleaning and duplicate IDs are removed',()=>{
 const ids=achievements.map(b=>b.id);assert.equal(ids.length,12);assert.equal(new Set(ids).size,12);
 assert.deepEqual(cleanExperience({badges:[...ids,'forged',ids[0]]}).badges,ids);
});
test('empty journal never awards badges',()=>assert.deepEqual(journalAchievements([],coffees),[]));
test('three coffees from two countries do not earn three-country badge',()=>{
 const earned=journalAchievements(['a','b','c'].map(id=>entry(id)),coffees);
 assert.ok(earned.includes('three-origins'));assert.ok(!earned.includes('three-countries'));
});
test('country exploration excludes blends and unknown products',()=>{
 const earned=journalAchievements(['a','b','c','blend','unknown'].map(id=>entry(id)),coffees);
 assert.ok(!earned.includes('three-countries'));assert.ok(!earned.includes('six-coffees'));
});
test('six countries, decaf and ten saved tastings unlock their actual milestones',()=>{
 const entries=['a','b','c','d','e','f','g','a','a','a'].map(id=>entry(id));
 const earned=journalAchievements(entries,coffees);
 for(const id of ['first-tasting','five-tastings','ten-tastings','six-coffees','three-countries','six-countries','decaf-tasting'])assert.ok(earned.includes(id),id);
 assert.ok(!earned.includes('recipe-explorer'));assert.ok(!earned.includes('first-review'));
});
test('recipe exploration requires different parameters on the same coffee',()=>{
 assert.ok(!journalAchievements([entry('a'),entry('b',{grind:56})],coffees).includes('recipe-explorer'));
 assert.ok(journalAchievements([entry('a'),entry('a',{grind:56})],coffees).includes('recipe-explorer'));
});
