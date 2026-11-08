// The academic seed remains identified internally. Public copy uses the merchant's
// catalogue presentation; fictional data provenance is documented in the project README.
export function publicCatalog(products:any[]){return products.map(product=>{
 const metadata={...(product.metadata||{})};
 for(const key of ['demo','catalog_source','informatii_demo'])delete metadata[key];
 return {...product,metadata};
});}
