import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
import {createUsersWorkflow} from '@medusajs/core-flows';
import seed from './seed-cafea';
import expandCoffee from './expand-coffee-catalog';
import expandAccessories from './expand-accessory-catalog';
import setupOrigin from './setup-origin';
import setupCheckout from './setup-checkout';
import setupReviews from './setup-reviews';
import setupMystery from './setup-mystery';
export default async function initialize(args:ExecArgs){
 const {container}=args,db:any=container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 if(!await db.schema.hasTable('origin_deployment_state'))await db.schema.createTable('origin_deployment_state',(t:any)=>{t.string('id').primary();t.timestamp('completed_at').defaultTo(db.fn.now());});
 if(!await db('origin_deployment_state').where({id:'catalog-v1'}).first()){
  if(!(await container.resolve(Modules.REGION).listRegions({})).length)await seed(args);
  await expandCoffee(args);await expandAccessories(args);await setupOrigin(args);await setupCheckout(args);await setupReviews(args);await setupMystery(args);
  await db('origin_deployment_state').insert({id:'catalog-v1'}).onConflict('id').ignore();
 }else{await setupOrigin(args);await setupReviews(args);}
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
