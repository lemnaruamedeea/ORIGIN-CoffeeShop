import {validateMysteryCart} from '../../lib/origin-mystery';
import {completeCartWorkflow} from '@medusajs/core-flows';
import {ContainerRegistrationKeys,MedusaError} from '@medusajs/framework/utils';
import {paymentConfig} from '../../lib/origin-payments-config';

// Applies to BFF, native Store API and webhook completion alike. A browser cannot bypass it
// by replacing a Stripe session with the manual provider or changing the cart after payment.
completeCartWorkflow.hooks.validate(async({cart},{container})=>{
 const db:any=container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
 await validateMysteryCart(container,cart);
 const row=await db('origin_checkouts').where({cart_id:cart.id}).first();
 if(!row||row.order_id)return;
 const deny=(message:string)=>{throw new MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,message);};
 if(row.customer_id!==cart.customer_id||!row.payment_method||cart.currency_code!=='ron')deny('Origin checkout owner, currency or payment method is invalid.');
 const expected=Math.round(Number(row.expected_total)*100),total=Math.round(Number(cart.total)*100);
 if(row.expected_total===null||!Number.isSafeInteger(expected)||expected<=0||expected!==total)deny('Origin checkout total changed after payment initialization.');
 const provider=row.payment_method==='stripe'?'pp_stripe_stripe':'pp_system_default';
 const sessions=(cart.payment_collection?.payment_sessions||[]).filter((s:any)=>!['canceled','error'].includes(s.status));
 if(sessions.length!==1||sessions[0].provider_id!==provider||Math.round(Number(sessions[0].amount)*100)!==expected||sessions[0].currency_code!=='ron')deny('Origin checkout payment session or amount does not match.');
 if(row.payment_method==='stripe'){
  const cfg=paymentConfig(),id=sessions[0].data?.id;
  if(!cfg.configured||typeof id!=='string'||!/^pi_[A-Za-z0-9]+$/.test(id))deny('Stripe Sandbox configuration is missing.');
  const response=await fetch('https://api.stripe.com/v1/payment_intents/'+id,{headers:{Authorization:'Bearer '+cfg.key},signal:AbortSignal.timeout(20000)});
  if(!response.ok)deny('Stripe Sandbox verification unavailable.');
  const intent:any=await response.json();
  if(intent.livemode!==false||intent.currency!=='ron'||intent.amount!==expected)deny('Stripe Sandbox amount or currency does not match the cart.');
  if(intent.status!=='succeeded'&&intent.status!=='requires_capture')throw new MedusaError(MedusaError.Types.PAYMENT_REQUIRES_MORE_ERROR,'Stripe payment is not confirmed.');
  if(intent.status==='succeeded'&&intent.amount_received!==expected)deny('Stripe received amount does not match.');
 }
});
