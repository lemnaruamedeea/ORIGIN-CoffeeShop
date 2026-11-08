import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {allowOrigin,fail} from '../../../../lib/origin-store';
import {changePassword} from '../../../../lib/origin-account-settings';
export async function POST(req:MedusaRequest,res:MedusaResponse){try{allowOrigin(req);res.setHeader('Cache-Control','no-store');await changePassword(req,res);res.json({changed:true});}catch(e){fail(res,e);}}
