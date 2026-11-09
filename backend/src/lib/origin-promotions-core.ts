export const FIRST_ORDER_CODE='PRIMAORIGINE';
export const FREE_SHIPPING_CODE='ORIGIN-LIVRARE';
export const FIRST_ORDER_MINIMUM=80;
export const FREE_SHIPPING_MINIMUM=180;
export const REWARD_DAYS=14;
export const normalizeEmail=(value:string)=>String(value||'').trim().toLowerCase();
export const cents=(value:any)=>Math.round(Number(value||0)*100);
export const freeShipping=(netItems:number)=>cents(netItems)>=cents(FREE_SHIPPING_MINIMUM);
export function couponCode(raw:unknown){
 if(typeof raw!=='string')return '';
 const code=raw.trim().toUpperCase();
 return code.length<=60&&/^[A-Z0-9-]*$/.test(code)?code:null;
}
export function rewardValid(reward:any,email:string,now=Date.now()){
 return !!reward&&normalizeEmail(reward.email)===normalizeEmail(email)&&new Date(reward.expires_at).getTime()>now;
}
export function promotionTotals(cart:any){
 // Expose delivery after its own discount; product discounts remain a separate line.
 const shippingDiscount=(cart.shipping_methods||[]).reduce((sum:number,s:any)=>sum+(s.adjustments||[]).reduce((n:number,a:any)=>n+Number(a.amount||0),0),0);
 return {subtotal:Number(cart.original_item_subtotal),shipping:Math.max(0,Number(cart.original_shipping_subtotal||0)-shippingDiscount),tax:Number(cart.tax_total),discount:Math.max(0,Number(cart.discount_subtotal||0)-shippingDiscount),total:Number(cart.total),shippingDiscount};
}
export const netItems=(cart:any)=>Number(cart.original_item_subtotal)-promotionTotals(cart).discount;
