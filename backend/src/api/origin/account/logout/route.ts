import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {allowOrigin,fail} from '../../../../lib/origin-store';
import {logoutCustomer} from '../../../../lib/origin-accounts';
export async function POST(req:MedusaRequest,res:MedusaResponse){try{allowOrigin(req);await logoutCustomer(req,res);res.setHeader('Cache-Control','no-store');res.json({success:true});}catch(e){fail(res,e);}}
