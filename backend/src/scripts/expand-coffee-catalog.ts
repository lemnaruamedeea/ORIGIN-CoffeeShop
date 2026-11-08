import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys,Modules,ProductStatus} from '@medusajs/framework/utils';
import {createProductCategoriesWorkflow,createProductsWorkflow,updateProductsWorkflow,createInventoryLevelsWorkflow} from '@medusajs/core-flows';

export default async function expandCoffeeCatalog({container}:ExecArgs){
 const logger=container.resolve(ContainerRegistrationKeys.LOGGER),query=container.resolve(ContainerRegistrationKeys.QUERY);
 const coffees:any[]=JSON.parse(readFileSync(join(process.cwd(),'data/catalog-expanded.json'),'utf8'));
 if(new Set(coffees.map(c=>c.handle)).size!==coffees.length)throw Error('Duplicate catalog handles.');
 for(const c of coffees)if(!c.demo||!c.farm||!c.producer||!c.altitude||!c.varieties?.length||!c.description||c.price<=0||c.large<=0||c.stock250<0||c.stock1000<0)throw Error('Incomplete demo record: '+c.handle);
 const productService:any=container.resolve(Modules.PRODUCT),inventory:any=container.resolve(Modules.INVENTORY);
 const fulfillment:any=container.resolve(Modules.FULFILLMENT),channels:any=container.resolve(Modules.SALES_CHANNEL),locations:any=container.resolve(Modules.STOCK_LOCATION);
 const profiles=await fulfillment.listShippingProfiles({type:'default'}),sales=await channels.listSalesChannels({name:'Default Sales Channel'}),stockLocations=await locations.listStockLocations({});
 if(!profiles[0]||!sales[0]||!stockLocations[0])throw Error('Run the original store setup before expanding the catalog.');
 const categoryDefinitions=[['cafea-espresso','Cafea pentru espresso'],['cafea-filtru','Cafea pentru filtru'],['cafea-decofeinizata','Cafea decofeinizată'],['blenduri','Blenduri']];
 const categories:Record<string,string>={};
 for(const [handle,name] of categoryDefinitions){const found=await productService.listProductCategories({handle});if(found[0])categories[handle]=found[0].id;else{const {result}=await createProductCategoriesWorkflow(container).run({input:{product_categories:[{handle,name,is_active:true}]}});categories[handle]=result[0].id;}}
 const {data:existing}=await query.graph({entity:'product',fields:['id','handle','metadata'],filters:{handle:coffees.map(c=>c.handle)}});
 let created=0,updated=0;
 for(const c of coffees){
  const present=existing.find((p:any)=>p.handle===c.handle);
  if(present&&!present.metadata?.demo){logger.warn('Keeping the existing non-demo product: '+c.handle);continue;}
  const metadata={...(present?.metadata||{}),demo:true,catalog_source:'origin-demo-expanded',lot:c.lot,origine:c.country,cod_tara:c.countryCode,regiune:c.region,ferma:c.farm,producator:c.producer,altitudine:c.altitude,varietate:c.varieties.join(', '),procesare:c.process,prajire:c.roast,note_aromatice:c.notes.join(', '),preparare:c.methods.join(' / '),recolta:c.harvest,prajitorie:c.roaster,culoare:c.color,gust_scor:c.flavor,aciditate:c.acidity,corp:c.body,decofeinizata:c.decaf,tip_cafea:c.kind,informatii_demo:'Lotul, ferma și producătorul sunt fictive; prețuri și stocuri pentru testare.'};
  const category_ids=[...(c.methods.some((m:string)=>['Espresso','Moka','Ibric'].includes(m))?[categories['cafea-espresso']]:[]),...(c.methods.some((m:string)=>['V60','AeroPress','French Press'].includes(m))?[categories['cafea-filtru']]:[]),...(c.decaf?[categories['cafea-decofeinizata']]:[]),...(c.kind==='Blend'?[categories.blenduri]:[])];
  const image=`${process.env.ORIGIN_ASSET_BASE_URL||'http://127.0.0.1:9000'}/static/${c.handle}.svg`;
  const details={title:c.title,subtitle:c.notes.join(' · '),description:c.description,metadata,category_ids,thumbnail:image,images:[{url:image}],origin_country:c.countryCode==='MIX'?undefined:c.countryCode.toLowerCase()};
  if(present){await updateProductsWorkflow(container).run({input:{products:[{id:present.id,...details}]}});updated++;}
  else{await createProductsWorkflow(container).run({input:{products:[{...details,handle:c.handle,status:ProductStatus.PUBLISHED,weight:250,shipping_profile_id:profiles[0].id,sales_channels:[{id:sales[0].id}],options:[{title:'Gramaj',values:['250 g','1 kg']}],variants:[{title:'250 g',sku:c.sku+'-250',weight:250,manage_inventory:true,allow_backorder:false,options:{Gramaj:'250 g'},prices:[{currency_code:'ron',amount:c.price}]},{title:'1 kg',sku:c.sku+'-1000',weight:1000,manage_inventory:true,allow_backorder:false,options:{Gramaj:'1 kg'},prices:[{currency_code:'ron',amount:c.large}]}]}]}});created++;}
 }
 const skus=coffees.flatMap(c=>[c.sku+'-250',c.sku+'-1000']);
 const {data:items}=await query.graph({entity:'inventory_item',fields:['id','sku'],filters:{sku:skus}});
 const levels:any[]=[];
 for(const item of items){const c=coffees.find(c=>item.sku===c.sku+'-250'||item.sku===c.sku+'-1000');if(!c)continue;const found=await inventory.listInventoryLevels({inventory_item_id:item.id,location_id:stockLocations[0].id});if(!found.length)levels.push({inventory_item_id:item.id,location_id:stockLocations[0].id,stocked_quantity:String(item.sku).endsWith('-1000')?c.stock1000:c.stock250});}
 if(levels.length)await createInventoryLevelsWorkflow(container).run({input:{inventory_levels:levels}});
 logger.info(`ORIGIN demo catalog: ${created} products created, ${updated} enriched; ${levels.length} inventory levels added. Existing quantities, prices and customer data were preserved.`);
}
