import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
import {createUsersWorkflow,updateProductsWorkflow} from '@medusajs/core-flows';
import seed from './seed-cafea';
import expandCoffee from './expand-coffee-catalog';
import expandAccessories from './expand-accessory-catalog';
import setupOrigin from './setup-origin';
import setupCheckout from './setup-checkout';
import setupReviews from './setup-reviews';
import setupMystery from './setup-mystery';
async function repairSeedWeights(container:any){const products=container.resolve(Modules.PRODUCT);for(const v of await products.listProductVariants({},{take:200})){if(Number(v.weight)!==0)continue;const weight=v.title==='250 g'?250:v.title==='1 kg'?1000:0;if(weight)await products.updateProductVariants(v.id,{weight});}}
export default async function initialize(args:ExecArgs){
 const {container}=args,db:any=container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 if(!await db.schema.hasTable('origin_deployment_state'))await db.schema.createTable('origin_deployment_state',(t:any)=>{t.string('id').primary();t.timestamp('completed_at').defaultTo(db.fn.now());});
 if(!await db('origin_deployment_state').where({id:'catalog-v1'}).first()){
  if(!(await container.resolve(Modules.REGION).listRegions({})).length)await seed(args);
  await expandCoffee(args);await expandAccessories(args);await setupOrigin(args);await setupCheckout(args);await setupReviews(args);await repairSeedWeights(container);await setupMystery(args);
  await db('origin_deployment_state').insert({id:'catalog-v1'}).onConflict('id').ignore();
 }else{await setupOrigin(args);await setupReviews(args);}
 if(!await db('origin_deployment_state').where({id:'hosted-assets-v2'}).first()){
  await repairSeedWeights(container);
  const base=process.env.ORIGIN_ASSET_BASE_URL||process.env.RENDER_EXTERNAL_URL||'';
  const {data}=await container.resolve(ContainerRegistrationKeys.QUERY).graph({entity:'product',fields:['id','thumbnail','images.url'],pagination:{take:100}});
  const hosted=(url:string)=>url.startsWith('/static/')?base+url:url.replace('http://127.0.0.1:9000',base);
  for(const p of data)if(p.thumbnail&&(p.thumbnail.startsWith('/static/')||p.thumbnail.includes('127.0.0.1'))){await updateProductsWorkflow(container).run({input:{products:[{id:p.id,thumbnail:hosted(p.thumbnail),images:p.images.map((i:any)=>({url:hosted(i.url)}))}]}});}
  if(!await db('origin_mystery_samples').first()){
   const inventory=container.resolve(Modules.INVENTORY);
   for(const handle of ['ethiopia-guji','brazil-santos','colombia-huila'])for(const item of await inventory.listInventoryItems({sku:'ORIGIN-SAMPLE-'+handle.toUpperCase()}))for(const level of await inventory.listInventoryLevels({inventory_item_id:item.id}))if(Number(level.stocked_quantity)===0&&Number(level.reserved_quantity)===0)await inventory.updateInventoryLevels({inventory_item_id:item.id,location_id:level.location_id,stocked_quantity:20});
  }
  await db('origin_deployment_state').insert({id:'hosted-assets-v2'}).onConflict('id').ignore();
 }
 const email=process.env.ADMIN_EMAIL,password=process.env.ADMIN_PASSWORD;
 if(email&&password){
  const auth=container.resolve(Modules.AUTH),users=container.resolve(Modules.USER);let user=(await users.listUsers({email}))[0];
  if(!user){if(password.length<12)throw Error('ADMIN_PASSWORD must have at least 12 characters.');const {result}=await createUsersWorkflow(container).run({input:{users:[{email}]}});user=result[0];}
  const providers=await auth.listProviderIdentities({provider:'emailpass',entity_id:email});let identity:any;
  if(providers[0]?.auth_identity_id)identity=await auth.retrieveAuthIdentity(providers[0].auth_identity_id);
  if(!identity){const result=await auth.register('emailpass',{body:{email,password}} as any);if(!result.success||!result.authIdentity)throw Error('Admin setup failed.');identity=result.authIdentity;}
  if(!identity.app_metadata?.user_id)await auth.updateAuthIdentities({id:identity.id,app_metadata:{...identity.app_metadata,user_id:user.id}});
 }
 container.resolve(ContainerRegistrationKeys.LOGGER).info('Hosted store initialized; no customer or order data imported.');
}
