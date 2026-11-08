import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys,Modules,ProductStatus} from '@medusajs/framework/utils';
import {createProductCategoriesWorkflow,createProductsWorkflow,updateProductsWorkflow,createInventoryLevelsWorkflow} from '@medusajs/core-flows';

export default async function expandAccessories({container}:ExecArgs){
 const query=container.resolve(ContainerRegistrationKeys.QUERY),logger=container.resolve(ContainerRegistrationKeys.LOGGER);
 const items:any[]=JSON.parse(readFileSync(join(process.cwd(),'data/catalog-accessories.json'),'utf8'));
 if(new Set(items.map(c=>c.handle)).size!==items.length)throw Error('Duplicate accessory handles');
 for(const c of items)if(!c.demo||!c.producer||!c.material||!c.compatibility||!c.care||!c.unit||c.price<=0||!Number.isInteger(c.stock)||c.stock<0)throw Error('Incomplete accessory: '+c.handle);
 const products:any=container.resolve(Modules.PRODUCT),inventory:any=container.resolve(Modules.INVENTORY);
 const fulfillment:any=container.resolve(Modules.FULFILLMENT),channels:any=container.resolve(Modules.SALES_CHANNEL),locations:any=container.resolve(Modules.STOCK_LOCATION);
 const profiles=await fulfillment.listShippingProfiles({type:'default'}),sales=await channels.listSalesChannels({name:'Default Sales Channel'}),stockLocations=await locations.listStockLocations({});
 if(!profiles[0]||!sales[0]||!stockLocations[0])throw Error('Store setup missing');
 let category=(await products.listProductCategories({handle:'accesorii'}))[0];
 if(!category){const {result}=await createProductCategoriesWorkflow(container).run({input:{product_categories:[{handle:'accesorii',name:'Accesorii pentru preparare',is_active:true}]}});category=result[0];}
 const {data:existing}=await query.graph({entity:'product',fields:['id','handle','metadata'],filters:{handle:items.map(c=>c.handle)}});
 let created=0,updated=0;
 for(const c of items){
  const present=existing.find((p:any)=>p.handle===c.handle);
  if(present&&!present.metadata?.demo)continue;
  const image=`${process.env.ORIGIN_ASSET_BASE_URL||process.env.RENDER_EXTERNAL_URL||''}/static/${c.image||c.handle+'.svg'}`;
  const metadata={...(present?.metadata||{}),demo:true,catalog_source:'origin-accessories',product_type:'accessory',imagine_produs:c.image||c.handle+'.svg',tip_cafea:'Accesoriu',categorie_accesoriu:c.category,unitate:c.unit,producator:c.producer,preparare:c.methods.join(' / '),caracteristici:c.features,note_aromatice:c.features.join(', '),culoare:c.color,specificatii:{Material:c.material,Capacitate:c.capacity,Compatibilitate:c.compatibility,'În pachet':c.included},intretinere:c.care};
  const details={title:c.title,subtitle:c.features.join(' · '),description:c.description,metadata,category_ids:[category.id],thumbnail:image,images:[{url:image}]};
  if(present){await updateProductsWorkflow(container).run({input:{products:[{id:present.id,...details}]}});updated++;}
  else{await createProductsWorkflow(container).run({input:{products:[{...details,handle:c.handle,status:ProductStatus.PUBLISHED,weight:c.weight,shipping_profile_id:profiles[0].id,sales_channels:[{id:sales[0].id}],options:[{title:'Ambalare',values:[c.unit]}],variants:[{title:c.unit,sku:c.sku,weight:c.weight,manage_inventory:true,allow_backorder:false,options:{Ambalare:c.unit},prices:[{currency_code:'ron',amount:c.price}]}]}]}});created++;}
 }
 const {data:stockItems}=await query.graph({entity:'inventory_item',fields:['id','sku'],filters:{sku:items.map(c=>c.sku)}});
 const levels:any[]=[];
 for(const item of stockItems){const c=items.find(c=>c.sku===item.sku);const found=await inventory.listInventoryLevels({inventory_item_id:item.id,location_id:stockLocations[0].id});if(!found.length)levels.push({inventory_item_id:item.id,location_id:stockLocations[0].id,stocked_quantity:c.stock});}
 if(levels.length)await createInventoryLevelsWorkflow(container).run({input:{inventory_levels:levels}});
 logger.info(`Accessories: ${created} created, ${updated} enriched; ${levels.length} inventory levels added. Existing prices and stock preserved.`);
}
