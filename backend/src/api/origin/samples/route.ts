import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {checkoutCustomer,checkoutFail} from '../../../lib/origin-checkout';
import {customerSamples,revealSample} from '../../../lib/origin-mystery';
export async function GET(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res);res.json(await customerSamples(req.scope,c.id));}catch(e){checkoutFail(res,e);}}
export async function POST(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res,true);res.json(await revealSample(req.scope,c.id,req.body));}catch(e){checkoutFail(res,e);}}
