import type {MedusaRequest,MedusaResponse} from '@medusajs/framework/http';
import {aiConfig,aiReady} from '../../../lib/origin-config';
import {paymentConfig} from '../../../lib/origin-payments-config';
export async function GET(_req:MedusaRequest,res:MedusaResponse){const ai=aiConfig(),payment=paymentConfig();res.setHeader('Cache-Control','no-store');res.json({aiConfigured:await aiReady(ai),keyConfigured:!!ai.apiKey,liveEnabled:ai.liveEnabled,model:ai.model,provider:ai.provider,paymentsConfigured:payment.configured,paymentsTestMode:true,webhookConfigured:!!payment.webhookSecret});}
