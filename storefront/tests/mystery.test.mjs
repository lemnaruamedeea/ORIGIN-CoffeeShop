import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSamples,availableSets} from '../../backend/src/lib/origin-mystery-core.ts';
import {sampleEmail} from '../../backend/src/lib/origin-mail.ts';
import {isCoffee,isTastingSet,isAccessory,filterCatalog,emptyCatalogFilters,unitLabel} from '../src/catalog.ts';
const pool=Array.from({length:8},(_,i)=>({handle:'coffee-'+i,variantId:'variant-'+i,stock:i===0?0:20,snapshot:{name:'Secret Coffee '+i}}));
test('each set has three distinct in-stock coffees and unique private sample codes',()=>{
 const selected=selectSamples(pool,5);assert.equal(selected.length,15);assert.equal(new Set(selected.map(s=>s.code)).size,15);
 for(let i=1;i<=5;i++){const set=selected.filter(s=>s.setIndex===i);assert.equal(new Set(set.map(s=>s.coffee.handle)).size,3);assert.ok(set.every(s=>s.coffee.handle!=='coffee-0'));}
 assert.equal(pool[1].stock,20);
});
test('different random draws may select different coffees',()=>{assert.notDeepEqual(selectSamples(pool,1,()=>0).map(s=>s.coffee.handle),selectSamples(pool,1,max=>max-1).map(s=>s.coffee.handle));});
test('stock is never reused beyond availability, including uneven small pools',()=>{
 const scarce=pool.slice(0,5).map((p,i)=>({...p,stock:i===0?20:1}));assert.equal(availableSets(scarce),2);
 const chosen=selectSamples(scarce,2,()=>0);for(const p of scarce)assert.ok(chosen.filter(s=>s.coffee.handle===p.handle).length<=p.stock);
});
test('less than three distinct available coffees and invalid set quantities are rejected',()=>{
 assert.equal(availableSets([{stock:100},{stock:100}]),0);assert.throws(()=>selectSamples(pool.slice(0,2),1));for(const n of [0,1.5,6])assert.throws(()=>selectSamples(pool,n));
});
test('email contains slot codes and link, without leaking selected coffee identities',()=>{
 const selected=selectSamples(pool,1),mail=sampleEmail('Comanda #12',selected.map(s=>({set_index:s.setIndex,slot:s.slot,code:s.code})),'https://origin.example');
 for(const s of selected){assert.ok(mail.includes(s.code));assert.ok(!mail.includes(s.coffee.snapshot.name));}assert.ok(mail.includes('/#passport'));assert.ok(mail.includes('Mostra A'));
});
test('tasting kits are their own category and never coffees or accessories',()=>{
 const kit={id:'mystery-tasting-trio',kind:'Set degustare',name:'Trio',origin:'',region:'',notes:[],methods:['V60'],description:'',roast:'',process:'',flavor:0,acidity:1,price:49,large:49,unit:'1 set · 3 × 30 g',variants:[{weight:0,price:49,stock:10}]};
 assert.ok(isTastingSet(kit));assert.ok(!isCoffee(kit));assert.ok(!isAccessory(kit));assert.equal(unitLabel(kit,0),'1 set · 3 × 30 g');
 assert.equal(filterCatalog([kit],{...emptyCatalogFilters,type:'coffee'}).length,0);assert.equal(filterCatalog([kit],{...emptyCatalogFilters,type:'accessory'}).length,0);assert.equal(filterCatalog([kit],{...emptyCatalogFilters,type:'tasting'}).length,1);
});
