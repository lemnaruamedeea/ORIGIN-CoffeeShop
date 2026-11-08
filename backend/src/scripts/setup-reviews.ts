import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
export default async function setupReviews({container}:ExecArgs){
 const db:any=container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 if(!await db.schema.hasTable('origin_reviews'))await db.schema.createTable('origin_reviews',(t:any)=>{
  t.uuid('id').primary();t.string('product_id').notNullable();t.string('customer_id').notNullable();
  t.string('author_name',40).notNullable();t.integer('rating').notNullable();t.string('title',80).notNullable();t.text('body').notNullable();
  t.timestamp('created_at',{useTz:true}).notNullable();t.timestamp('updated_at',{useTz:true}).notNullable();
  t.unique(['product_id','customer_id']);t.index(['product_id','created_at']);
 });
 container.resolve(ContainerRegistrationKeys.LOGGER).info('Product review storage ready.');
}
