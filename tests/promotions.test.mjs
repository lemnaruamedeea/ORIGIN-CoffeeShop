import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const ts=require('typescript');
const source=readFileSync(new URL('../backend/src/lib/origin-promotions-core.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
const module={exports:{}};new Function('exports','module',js)(module.exports,module);
const {freeShipping,couponCode,rewardValid,promotionTotals}=module.exports;
test('free delivery starts at 180 RON of net products, with cent precision',()=>{
 assert.equal(freeShipping(179.99),false);assert.equal(freeShipping(180),true);
 assert.equal(freeShipping(195-19.5),false);assert.equal(freeShipping(260-26),true);
});
test('coupon normalization rejects malformed or multiple codes',()=>{
 assert.equal(couponCode(' primaorigine '),'PRIMAORIGINE');assert.equal(couponCode('a,b'),null);
 assert.equal(couponCode('a b'),null);assert.equal(couponCode('A'.repeat(61)),null);assert.equal(couponCode(''),'');
});
test('personal rewards require matching normalized email and a future expiry',()=>{
 const now=Date.parse('2026-11-09T12:00:00Z'),r={email:'Buyer@Example.com',expires_at:'2026-11-23T12:00:00Z'};
 assert.equal(rewardValid(r,' buyer@example.com ',now),true);assert.equal(rewardValid(r,'other@example.com',now),false);
 assert.equal(rewardValid({...r,expires_at:new Date(now)},r.email,now),false);assert.equal(rewardValid(null,r.email,now),false);
});
test('order summary does not double count free delivery as a product discount',()=>{
 const t=promotionTotals({original_item_subtotal:260,original_shipping_subtotal:10,discount_subtotal:36,shipping_methods:[{adjustments:[{amount:10}]}],tax_total:0,total:234});
 assert.equal(t.subtotal-t.discount+t.shipping+t.tax,t.total);assert.equal(t.discount,26);assert.equal(t.shippingDiscount,10);
});
