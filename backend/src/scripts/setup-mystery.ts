import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys,Modules,ProductStatus} from '@medusajs/framework/utils';
import {createProductsWorkflow,updateProductsWorkflow,createProductVariantsWorkflow,createInventoryLevelsWorkflow} from '@medusajs/core-flows';
import {ensureCoffeeCode,MYSTERY_HANDLE} from '../lib/origin-mystery';
export default async function setupMystery({container}:ExecArgs){
 const db:any=container.resolve(ContainerRegistrationKeys.PG_CONNECTION),query=container.resolve(ContainerRegistrationKeys.QUERY),products:any=container.resolve(Modules.PRODUCT),inventory:any=container.resolve(Modules.INVENTORY);
 if(!await db.schema.hasTable('origin_coffee_codes'))await db.schema.createTable('origin_coffee_codes',(t:any)=>{t.string('coffee_handle').primary();t.string('code').unique().notNullable();});
 if(!await db.schema.hasTable('origin_mystery_settings'))await db.schema.createTable('origin_mystery_settings',(t:any)=>{t.string('id').primary();t.string('variant_id').notNullable();});
 if(!await db.schema.hasTable('origin_mystery_samples'))await db.schema.createTable('origin_mystery_samples',(t:any)=>{
  t.uuid('id').primary();t.string('cart_id').notNullable();t.string('order_id');t.string('customer_id').notNullable();t.integer('set_index').notNullable();t.integer('slot').notNullable();t.string('coffee_handle').notNullable();t.string('variant_id').notNullable();t.string('code').unique().notNullable();t.jsonb('snapshot').notNullable();t.text('note');t.timestamp('revealed_at',{useTz:true});t.timestamp('created_at',{useTz:true}).defaultTo(db.fn.now());t.unique(['cart_id','set_index','slot']);t.index(['customer_id','order_id']);
 });
 if(!await db.schema.hasTable('origin_mail_outbox'))await db.schema.createTable('origin_mail_outbox',(t:any)=>{
  t.uuid('id').primary();t.string('order_id').unique().notNullable();t.string('recipient').notNullable();t.string('subject').notNullable();t.string('status').notNullable();t.integer('attempts').notNullable().defaultTo(0);t.timestamp('created_at',{useTz:true}).defaultTo(db.fn.now());t.timestamp('sent_at',{useTz:true});t.timestamp('locked_at',{useTz:true});t.timestamp('next_attempt_at',{useTz:true});t.text('last_error');
 });
 const locations:any=container.resolve(Modules.STOCK_LOCATION),stockLocation=(await locations.listStockLocations({}))[0];if(!stockLocation)throw Error('Stock location missing');
 const {data:coffees}=await query.graph({entity:'product',fields:['id','handle','title','metadata','options.id','options.title','options.values.value','variants.id','variants.sku','variants.weight','variants.inventory_items.inventory.location_levels.*'],filters:{status:'published'},pagination:{take:100}});
 for(const p of coffees.filter((p:any)=>!p.metadata?.product_type&&p.metadata?.tip_cafea!=='Accesoriu')){
  await ensureCoffeeCode(db,p.handle);
  const sku='ORIGIN-SAMPLE-'+p.handle.toUpperCase();
  if(!p.variants?.some((v:any)=>v.sku===sku)){
   const option=p.options.find((o:any)=>o.title==='Gramaj');if(!option)continue;
   await products.updateProductOptionValuesOnProduct({product_id:p.id,product_option_id:option.id,add:[{value:'Mostră 30 g'}]});
   await createProductVariantsWorkflow(container).run({input:{product_variants:[{product_id:p.id,title:'Mostră 30 g',sku,weight:30,manage_inventory:true,allow_backorder:false,metadata:{origin_mystery_sample:true},options:{Gramaj:'Mostră 30 g'},prices:[]}]}});
  }
  const {data:items}=await query.graph({entity:'inventory_item',fields:['id','sku'],filters:{sku}});
  for(const item of items){const found=await inventory.listInventoryLevels({inventory_item_id:item.id,location_id:stockLocation.id});if(!found.length){const source=p.variants?.find((v:any)=>Number(v.weight)===250);const inStock=source?.inventory_items?.some((i:any)=>i.inventory?.location_levels?.some((l:any)=>Number(l.stocked_quantity)>Number(l.reserved_quantity)));await createInventoryLevelsWorkflow(container).run({input:{inventory_levels:[{inventory_item_id:item.id,location_id:stockLocation.id,stocked_quantity:inStock?20:0}]}});}}
 }
 const fulfillment:any=container.resolve(Modules.FULFILLMENT),channels:any=container.resolve(Modules.SALES_CHANNEL);
 const profile=(await fulfillment.listShippingProfiles({type:'default'}))[0],channel=(await channels.listSalesChannels({name:'Default Sales Channel'}))[0];
 let bundle=(await products.listProducts({handle:MYSTERY_HANDLE}))[0];
 if(!bundle){await createProductsWorkflow(container).run({input:{products:[{title:'Mystery Tasting — 3 × 30 g',handle:MYSTERY_HANDLE,status:ProductStatus.PUBLISHED,description:'Trei cafele diferite, alese aleatoriu dintre loturile disponibile pentru degustare. Fiecare mostră de 30 g are propriul cod, pe care îl poți dezvălui în Pașaport după ce îți notezi impresia. Primești codurile și prin e-mail, la adresa contului care plasează comanda. Selecția diferă aleatoriu între comenzi, iar același lot poate apărea din nou într-o comandă viitoare.',weight:90,shipping_profile_id:profile.id,sales_channels:[{id:channel.id}],thumbnail:'/static/mystery-tasting-trio.svg',images:[{url:'/static/mystery-tasting-trio.svg'}],metadata:{demo:true,product_type:'tasting_set',tip_cafea:'Set degustare',unitate:'1 set · 3 × 30 g',categorie_accesoriu:'Seturi de degustare',producator:'ORIGIN Coffee',note_aromatice:'3 cafele distincte,Selecție aleatorie,Coduri personale',caracteristici:['3 cafele distincte','Selecție aleatorie','Coduri personale'],preparare:'V60 / AeroPress',specificatii:{Conținut:'3 mostre a câte 30 g','Cafea':'Boabe; trei loturi distincte per set','Selecție':'Aleatorie, din stocul de mostre disponibil','Coduri':'Unice per mostră și comandă'},intretinere:'Păstrează mostrele închise, la loc uscat și răcoros. Introdu codurile în Pașaport din contul care a plasat comanda.',culoare:'#777757'},options:[{title:'Ambalare',values:['1 set · 3 × 30 g']}],variants:[{title:'1 set · 3 × 30 g',sku:'ORIGIN-MYSTERY-TRIO',weight:90,manage_inventory:false,options:{Ambalare:'1 set · 3 × 30 g'},prices:[{currency_code:'ron',amount:49}]}]}]}});bundle=(await products.listProducts({handle:MYSTERY_HANDLE}))[0];}
 await updateProductsWorkflow(container).run({input:{products:[{id:bundle.id,thumbnail:'/static/mystery-tasting-trio-studio.webp',images:[{url:'/static/mystery-tasting-trio-studio.webp'}],metadata:{...bundle.metadata,imagine_produs:'mystery-tasting-trio-studio.webp'}}]}});
 const variants=await products.listProductVariants({product_id:bundle.id});await db('origin_mystery_settings').insert({id:'bundle',variant_id:variants[0].id}).onConflict('id').merge();
 container.resolve(ContainerRegistrationKeys.LOGGER).info('Mystery storage, stable coffee IDs, dedicated 30 g sample inventory and tasting set ready. Existing stock/prices preserved.');
}
