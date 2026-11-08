import {api} from './api';
export type CartItem={key:string;coffeeId:string;weight:number;grind:string;quantity:number};
export type AddressForm={firstName:string;lastName:string;address:string;details:string;city:string;county:string;postalCode:string;phone:string};
export type Address={first_name:string;last_name:string;address_1:string;address_2:string;city:string;province:string;postal_code:string;phone:string;country_code:string};
export type OrderItem={id:string;coffeeId:string|null;title:string;variant:string;quantity:number;unitPrice:number;total:number;grind:string;weight:number|null;mystery?:boolean};
export type Totals={subtotal:number;shipping:number;tax:number;discount:number;total:number;currency:string};
export type Checkout=Totals&{id:string;orderId:string|null;completed:boolean;email:string;address:Address;items:OrderItem[];shippingOptionId:string|null;shippingOptions:{id:string;name:string;description:string;amount:number}[];paymentMethod:'cash'|'stripe'|null;clientSecret:string|null};
export type PaymentOptions={stripeAvailable:boolean;publicKey:string|null;testMode:boolean;webhookConfigured:boolean};
export type Order=Totals&{id:string;number:number;status:string;createdAt:string;email:string;address:Address;items:OrderItem[];paymentMethod:'cash'|'stripe';paymentStatus:string;deliveryStatus:string;testMode:boolean};
const post=<T,>(path:string,body:unknown={})=>api<T>(path,{method:'POST',body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
export const checkoutAPI={
 load:()=>api<{options:PaymentOptions;active:Checkout|null}>('checkout'),
 create:(requestId:string,items:CartItem[],address:AddressForm,email?:string)=>post<{checkout:Checkout}>('checkout',{requestId,items,address,email}),
 get:(id:string)=>api<{checkout:Checkout}>('checkout/'+encodeURIComponent(id)),
 shipping:(id:string,optionId:string)=>post<{checkout:Checkout}>(`checkout/${encodeURIComponent(id)}/shipping`,{optionId}),
 payment:(id:string,method:'cash'|'stripe')=>post<{checkout:Checkout}>(`checkout/${encodeURIComponent(id)}/payment`,{method}),
 complete:(id:string)=>post<{order:Order}>(`checkout/${encodeURIComponent(id)}/complete`),
 orders:(offset=0)=>api<{orders:Order[];count:number;offset:number}>('orders?offset='+offset),
 order:(id:string)=>api<{order:Order}>('orders/'+encodeURIComponent(id)),
};
export const formatRON=(n:number)=>new Intl.NumberFormat('ro-RO',{style:'currency',currency:'RON'}).format(n);
export const paymentLabel=(s:string)=>({cash_due:'De achitat la livrare',cash_paid:'Ramburs achitat',paid:'Plătită',authorized:'Autorizată',pending:'În așteptarea plății',canceled:'Anulată'}[s]||'În verificare');
export const deliveryLabel=(s:string)=>({processing:'În pregătire',shipped:'Expediată',delivered:'Livrată',canceled:'Anulată'}[s]||'În pregătire');
