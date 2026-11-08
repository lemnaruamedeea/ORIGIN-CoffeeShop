import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {checkoutCustomer,checkoutFail,preparePayment} from '../../../../../lib/origin-checkout';
export async function POST(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res,true);res.json({checkout:await preparePayment(req,c,req.params.id)});}catch(e){checkoutFail(res,e);}}

