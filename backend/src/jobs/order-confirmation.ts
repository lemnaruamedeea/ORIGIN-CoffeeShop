import type {MedusaContainer} from '@medusajs/framework/types';
import {deliverOrderConfirmations} from '../lib/origin-order-mail';
export default async function orderMail(container:MedusaContainer){await deliverOrderConfirmations(container);}
export const config={name:'origin-order-confirmation',schedule:'* * * * *'};
