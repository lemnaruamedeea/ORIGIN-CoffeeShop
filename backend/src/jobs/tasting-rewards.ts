import type {MedusaContainer} from '@medusajs/framework/types';
import {processTastingRewards} from '../lib/origin-promotion-mail';
export default async function rewards(container:MedusaContainer){await processTastingRewards(container);}
export const config={name:'origin-tasting-rewards',schedule:'* * * * *'};
