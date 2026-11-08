import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptCatalogProducts,filterCatalog,emptyCatalogFilters} from '../src/catalog.ts';
import {recommend,demoReply,defaultBrew} from '../src/domain.ts';
const records=JSON.parse(readFileSync(new URL('../../catalog-expanded.json',import.meta.url),'utf8'));
const products=records.map(c=>({id:c.handle,name:c.title,description:c.description,metadata:{origine:c.country,cod_tara:c.countryCode,regiune:c.region,ferma:c.farm,producator:c.producer,altitudine:c.altitude,varietate:c.varieties.join(', '),procesare:c.process,prajire:c.roast,note_aromatice:c.notes.join(', '),preparare:c.methods.join(' / '),gust_scor:c.flavor,aciditate:c.acidity,corp:c.body,culoare:c.color,decofeinizata:c.decaf,tip_cafea:c.kind,demo:true},variants:[{id:c.handle+'-250',weight:250,price:c.price,stock:c.stock250},{id:c.handle+'-1000',weight:1000,price:c.large,stock:c.stock1000}]}));
const coffees=adaptCatalogProducts(products);
const find=(filters={},aroma)=>filterCatalog(coffees,{...emptyCatalogFilters,...filters},aroma);

test('catalogul are 18 loturi complete și distincte, cu o prezentare comercială',()=>{
 assert.equal(records.length,18);assert.equal(new Set(records.map(c=>c.handle)).size,records.length);
 for(const c of records){assert.ok(c.demo&&c.farm&&c.producer&&c.region&&c.altitude&&c.harvest&&c.description&&c.varieties.length);assert.ok(!/demonstrativ|\bdemo\b/i.test(c.description));}
});
test('metadatele determină profilul noilor produse și datele producătorului',()=>{
 const peru=coffees.find(c=>c.id==='peru-cajamarca');assert.equal(peru.flavor,-1);assert.equal(peru.acidity,1);assert.equal(peru.producer,'Cooperativa Alto Verde');assert.deepEqual(peru.varieties,['Typica','Caturra']);
 assert.equal(coffees.find(c=>c.id==='colombia-decaf').decaf,true);
});
test('căutarea ignoră diacriticele și caută inclusiv producător, varietate și note',()=>{
 assert.equal(find({search:'cafea-inexistenta'}).length,0);
 assert.ok(find({search:'alto verde'}).some(c=>c.id==='peru-cajamarca'));
 assert.ok(find({search:'migdale'}).some(c=>c.id==='guatemala-antigua'));
 assert.ok(find({search:'tarrazu honey'}).some(c=>c.id==='costa-rica-tarrazu'));
 assert.ok(find({search:'sl28'}).some(c=>c.id==='kenya-kirinyaga'));
});
test('filtrele se combină și decaf este separat de cafeaua obișnuită',()=>{
 assert.deepEqual(find({caffeine:'decaf',method:'V60',maxPrice:'70'}).map(c=>c.id),['colombia-decaf']);
 assert.ok(find({origin:'Etiopia',acidity:'3'}).every(c=>c.id==='ethiopia-guji'));
 assert.ok(find({},'Echilibrat').every(c=>c.flavor===0));
});
test('prețul și disponibilitatea se verifică pentru gramajul ales',()=>{
 assert.equal(find({origin:'Rwanda',weight:'1000',inStock:true}).length,0);
 assert.equal(find({origin:'Rwanda',weight:'250',inStock:true}).length,1);
 assert.equal(find({origin:'Kenya',inStock:true}).length,0);
 assert.ok(find({weight:'1000',maxPrice:'200'}).every(c=>c.large<=200));
 assert.equal(find({minPrice:'100',maxPrice:'20'}).length,0);
});
test('recomandările exclud loturile epuizate, iar demo Barista recunoaște cafelele noi',()=>{
 assert.ok(!recommend({flavor:1,acidity:3,milk:false,method:'V60',name:'test'},[],coffees).some(c=>c.id==='kenya-kirinyaga'));
 const single=coffees.filter(c=>c.id==='peru-cajamarca');assert.match(demoReply('Prea acidă',[],{...defaultBrew,coffeeId:'peru-cajamarca'},null,single),/Peru Cajamarca/);
});
