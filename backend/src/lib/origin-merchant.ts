// Fictional merchant identity requested for the academic project. Verify and replace
// these details before accepting real orders or issuing fiscal documents.
export const merchant={
 name:process.env.ORIGIN_MERCHANT_NAME||'Origin Coffee Roasters SRL',
 brand:'ORIGIN Coffee',
 taxId:process.env.ORIGIN_MERCHANT_TAX_ID||'RO48271605',
 registration:process.env.ORIGIN_MERCHANT_REGISTRATION||'J08/1246/2024',
 address:process.env.ORIGIN_MERCHANT_ADDRESS||'Strada Aromelor nr. 12, Brașov, România',
};
