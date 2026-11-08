import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {allowOrigin,fail} from '../../../../lib/origin-store';
import {authenticateCustomer} from '../../../../lib/origin-accounts';
export async function POST(req:MedusaRequest,res:MedusaResponse){try{allowOrigin(req);res.setHeader('Cache-Control','no-store');res.json({customer:await authenticateCustomer(req,res,false)});}catch(e){fail(res,e);}}
