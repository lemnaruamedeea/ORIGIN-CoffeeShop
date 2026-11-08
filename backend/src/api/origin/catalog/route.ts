import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {catalog,fail} from '../../../lib/origin-store';
import {publicCatalog} from '../../../lib/origin-public-catalog';
export async function GET(req:MedusaRequest,res:MedusaResponse){try{res.setHeader('Cache-Control','no-store');res.json({products:publicCatalog(await catalog(req.scope)),source:'medusa'});}catch(e){fail(res,e);}}
