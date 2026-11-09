import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {checkoutCustomer,checkoutFail,getCheckout} from '../../../../../lib/origin-checkout';
import {changePromotion} from '../../../../../lib/origin-promotions';
export async function POST(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res,true);await changePromotion(req,c.id,req.params.id);res.json({checkout:await getCheckout(req,c.id,req.params.id)});}catch(e){checkoutFail(res,e);}}
