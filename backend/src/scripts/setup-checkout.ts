import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys,Modules} from '@medusajs/framework/utils';
import {updateRegionsWorkflow} from '@medusajs/core-flows';
import {paymentConfig} from '../lib/origin-payments-config';
export default async function setupCheckout({container}:ExecArgs){
 const db:any=container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 if(!await db.schema.hasTable('origin_checkouts'))await db.schema.createTable('origin_checkouts',(t:any)=>{
  t.string('id').primary();t.string('customer_id').notNullable().index();t.string('fingerprint',64).notNullable();
  t.string('cart_id').unique();t.string('order_id').index();t.string('payment_method');
  t.timestamp('created_at',{useTz:true}).notNullable().defaultTo(db.fn.now());
 });
 if(!await db.schema.hasColumn('origin_checkouts','expected_total'))await db.schema.alterTable('origin_checkouts',(t:any)=>t.decimal('expected_total',20,4));
 const {data:regions}=await container.resolve(ContainerRegistrationKeys.QUERY).graph({entity:'region',fields:['id','currency_code','countries.iso_2','payment_providers.id'],filters:{currency_code:'ron'}});
 const region=regions.find((r:any)=>r.countries?.some((c:any)=>c.iso_2==='ro'));
 if(!region)throw new Error('Romania / RON region is missing.');
 const ids=new Set(region.payment_providers?.map((p:any)=>p.id)||[]);ids.add('pp_system_default');
 if(paymentConfig().configured)ids.add('pp_stripe_stripe');
 await updateRegionsWorkflow(container).run({input:{selector:{id:region.id},update:{payment_providers:[...ids]}}});
 // The historical starter named the zone Romania but still contained only western-European countries.
 const fulfillment=container.resolve(Modules.FULFILLMENT);
 const zones=await fulfillment.listServiceZones({name:'Romania'},{relations:['geo_zones']});
 for(const zone of zones)if(!zone.geo_zones?.some((g:any)=>g.country_code==='ro'))await fulfillment.createGeoZones({service_zone_id:zone.id,type:'country',country_code:'ro'});
 container.resolve(ContainerRegistrationKeys.LOGGER).info('Checkout storage ready; Romania payment providers configured (sandbox only).');
}
