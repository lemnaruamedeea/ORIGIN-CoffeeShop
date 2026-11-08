import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {checkoutCustomer,checkoutFail,checkoutOptions,activeCheckout,createCheckout} from '../../../lib/origin-checkout';
export async function GET(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res);res.json({options:await checkoutOptions(req),active:await activeCheckout(req,c.id)});}catch(e){checkoutFail(res,e);}}
export async function POST(req:MedusaRequest,res:MedusaResponse){try{const c=await checkoutCustomer(req,res,true);res.json({checkout:await createCheckout(req,c)});}catch(e){checkoutFail(res,e);}}

