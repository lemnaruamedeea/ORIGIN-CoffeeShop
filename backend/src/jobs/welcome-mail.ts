import type {MedusaContainer} from '@medusajs/framework/types';
import {deliverWelcomeMail} from '../lib/origin-welcome';
export default async function welcomeMail(container:MedusaContainer){await deliverWelcomeMail(container);}
export const config={name:'origin-welcome-mail',schedule:'* * * * *'};
