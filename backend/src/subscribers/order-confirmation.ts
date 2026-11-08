import type {SubscriberArgs,SubscriberConfig} from '@medusajs/framework';
import {queueOrderConfirmation} from '../lib/origin-order-mail';
export default async function orderConfirmation({event:{data},container}:SubscriberArgs<{id:string}>){await queueOrderConfirmation(container,data.id);}
export const config:SubscriberConfig={event:'order.placed'};
