import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {checkoutCustomer,checkoutFail,getOrder} from '../../../../../lib/origin-checkout';
import {customerSamples} from '../../../../../lib/origin-mystery';
export async function GET(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res);await getOrder(req,c.id,req.params.id);res.json(await customerSamples(req.scope,c.id,req.params.id));}catch(e){checkoutFail(res,e);}}
