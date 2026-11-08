import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {checkoutCustomer,checkoutFail,getOrder} from '../../../../lib/origin-checkout';
export async function GET(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res);res.json({order:await getOrder(req,c.id,req.params.id)});}catch(e){checkoutFail(res,e);}}

