import type {ExecArgs} from '@medusajs/framework/types';
import {setupPromotions} from '../lib/origin-promotions';
export default async function setup({container}:ExecArgs){await setupPromotions(container);}
