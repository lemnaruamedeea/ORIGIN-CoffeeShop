import {updateCartPromotionsWorkflow} from '@medusajs/core-flows';
import {StepResponse} from '@medusajs/framework/workflows-sdk';
import {promotionContext} from '../../lib/origin-promotions';
updateCartPromotionsWorkflow.hooks.setPromotionContext(async({cart},{container})=>new StepResponse(await promotionContext(container,cart)));
