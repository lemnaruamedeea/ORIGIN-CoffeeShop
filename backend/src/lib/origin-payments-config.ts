import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

// Only test keys are accepted by this academic prototype. Secret keys never leave the server.
export function paymentConfig(){
 const file=resolve(process.cwd(),'.env.payments.local');
 const local:Record<string,string>={};
 if(existsSync(file))for(const line of readFileSync(file,'utf8').split(/\r?\n/)){
  const match=line.match(/^(STRIPE_API_KEY|STRIPE_PUBLISHABLE_KEY|STRIPE_WEBHOOK_SECRET)=(.*)$/);
  if(match)local[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');
 }
 const key=process.env.STRIPE_API_KEY||local.STRIPE_API_KEY||'';
 const publicKey=process.env.STRIPE_PUBLISHABLE_KEY||local.STRIPE_PUBLISHABLE_KEY||'';
 const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET||local.STRIPE_WEBHOOK_SECRET||'';
 const configured=key.startsWith('sk_test_')&&publicKey.startsWith('pk_test_');
 return {key,publicKey,webhookSecret,configured};
}
