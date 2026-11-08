import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {checkoutCustomer,checkoutFail,listOrders} from '../../../lib/origin-checkout';
export async function GET(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res);res.json(await listOrders(req,c.id));}catch(e){checkoutFail(res,e);}}

