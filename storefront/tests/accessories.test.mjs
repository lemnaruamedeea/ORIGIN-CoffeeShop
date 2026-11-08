import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptCatalogProducts,filterCatalog,emptyCatalogFilters,isAccessory,unitLabel,variantPrice} from '../src/catalog.ts';
import {compactAICatalog} from '../../backend/src/lib/origin-ai.ts';
import {journalAchievements} from '../src/achievements.ts';
const records=JSON.parse(readFileSync(new URL('../../catalog-accessories.json',import.meta.url),'utf8'));
const products=records.map(c=>({id:c.handle,name:c.title,description:c.description,metadata:{product_type:'accessory',tip_cafea:'Accesoriu',categorie_accesoriu:c.category,unitate:c.unit,producator:c.producer,preparare:c.methods.join(' / '),caracteristici:c.features,specificatii:{Material:c.material,Capacitate:c.capacity,Compatibilitate:c.compatibility},intretinere:c.care},variants:[{id:c.sku,weight:0,price:c.price,stock:c.stock}]}));
const items=adaptCatalogProducts(products),find=filters=>filterCatalog(items,{...emptyCatalogFilters,...filters});
test('eight complete accessories have a unit price and stock, not a coffee package',()=>{
 assert.equal(items.length,8);assert.equal(new Set(items.map(c=>c.id)).size,8);
 for(const c of items){assert.ok(isAccessory(c));assert.ok(c.price>0);assert.equal(variantPrice(c,0),c.price);assert.ok(unitLabel(c,0));assert.ok(c.specifications.Material);assert.ok(c.care);assert.ok(c.description.length>150);assert.ok(c.variants[0].stock>0);}
 assert.ok(items.find(c=>c.id==='cantar-brew-precision').notes.includes('Rezoluție 0,1 g'));
});
test('accessory category, material, compatibility, method and price filters combine',()=>{
 assert.equal(find({type:'coffee'}).length,0);assert.equal(find({type:'accessory'}).length,8);
 assert.deepEqual(find({accessoryCategory:'Filtre',maxPrice:'30'}).map(c=>c.id),['filtre-conice-02']);
 assert.ok(find({search:'otel inoxidabil',method:'Espresso'}).some(c=>c.id==='tamper-espresso-58'));
 assert.equal(find({weight:'250'}).length,0);assert.equal(find({caffeine:'regular'}).length,0);
 assert.equal(filterCatalog(items,emptyCatalogFilters,'Fructat & floral').length,0);
});
test('accessories are never coffee recipes or journal exploration milestones',()=>{
 assert.deepEqual(compactAICatalog(products),[]);
 const entries=items.map(c=>({coffeeId:c.id,dose:20,ratio:16,temperature:93,grind:50}));
 const earned=journalAchievements(entries,items);
 assert.ok(!earned.includes('three-origins'));assert.ok(!earned.includes('six-coffees'));assert.ok(!earned.includes('three-countries'));
});
