import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {allowOrigin,fail} from '../../../../lib/origin-store';
import {updateAccount,deleteAccount} from '../../../../lib/origin-account-settings';
export async function PATCH(req:MedusaRequest,res:MedusaResponse){try{allowOrigin(req);res.setHeader('Cache-Control','no-store');res.json({customer:await updateAccount(req,res)});}catch(e){fail(res,e);}}
export async function DELETE(req:MedusaRequest,res:MedusaResponse){try{allowOrigin(req);res.setHeader('Cache-Control','no-store');await deleteAccount(req,res);res.json({deleted:true});}catch(e){fail(res,e);}}
