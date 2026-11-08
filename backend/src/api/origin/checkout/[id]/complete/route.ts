import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {checkoutCustomer,checkoutFail,finishCheckout} from '../../../../../lib/origin-checkout';
export async function POST(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res,true);res.json({order:await finishCheckout(req,c.id,req.params.id)});}catch(e){checkoutFail(res,e);}}

