import type {Coffee} from './domain';
export const isTastingSet=(p:Coffee)=>p.kind==='Set degustare';
export const isCoffee=(p:Coffee)=>p.kind!=='Accesoriu'&&!isTastingSet(p);
export const isUnitProduct=(p:Coffee)=>!isCoffee(p);
export const isAccessory=(p:Coffee)=>p.kind==='Accesoriu';
export const unitLabel=(p:Coffee,w:number)=>isUnitProduct(p)?p.unit||'1 bucată':w===1000?'1 kg':'250 g';
export const variantPrice=(p:Coffee,w:number)=>p.variants?.find(v=>v.weight===w)?.price??(w===1000?p.large:p.price);
export type CatalogFilters={type:string;accessoryCategory:string;search:string;origin:string;method:string;roast:string;process:string;note:string;acidity:string;weight:string;caffeine:string;minPrice:string;maxPrice:string;inStock:boolean};
export const emptyCatalogFilters:CatalogFilters={type:'all',accessoryCategory:'all',search:'',origin:'all',method:'all',roast:'all',process:'all',note:'all',acidity:'all',weight:'all',caffeine:'all',minPrice:'',maxPrice:'',inStock:false};
const normalized=(value:unknown)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ro').trim();
const numeric=(value:unknown,fallback:number,min:number,max:number)=>{const n=Number(value);return value!==undefined&&value!==null&&value!==''&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const list=(value:unknown,separator:RegExp,fallback:string[]=[])=>typeof value==='string'?value.split(separator).map(s=>s.trim()).filter(Boolean):fallback;
export function adaptCatalogProducts(products:any[],fallback:Coffee[]=[]):Coffee[]{return products.map(p=>{
 const original=fallback.find(c=>c.id===p.id),meta=p.metadata||{},variants=Array.isArray(p.variants)?p.variants:[];
 const small=variants.find((v:any)=>v.weight===250),large=variants.find((v:any)=>v.weight===1000);
 return {id:p.id,name:p.name,origin:meta.origine||original?.origin||'Origine nespecificată',countryCode:meta.cod_tara||'',region:meta.regiune||original?.region||'',notes:['accessory','tasting_set'].includes(meta.product_type)&&Array.isArray(meta.caracteristici)?meta.caracteristici.filter((v:unknown)=>typeof v==='string'):list(meta.note_aromatice,/,/,original?.notes||[]),price:small?.price??large?.price??variants[0]?.price??0,large:large?.price??small?.price??variants[0]?.price??0,color:/^#[0-9a-f]{6}$/i.test(meta.culoare)?meta.culoare:original?.color||'#7d765e',roast:'Prăjire '+(meta.prajire||'nespecificată'),process:meta.procesare||original?.process||'',flavor:numeric(meta.gust_scor,original?.flavor||0,-1,1),acidity:numeric(meta.aciditate,original?.acidity||2,1,3),body:numeric(meta.corp,2,1,3),methods:list(meta.preparare,/\//,original?.methods||[]),description:p.description||original?.description||'',variants,producer:meta.producator||'',farm:meta.ferma||'',altitude:meta.altitudine||'',varieties:list(meta.varietate,/,/),harvest:meta.recolta||'',roaster:meta.prajitorie||'',lot:meta.lot||'',decaf:meta.decofeinizata===true||meta.decofeinizata==='true',kind:meta.tip_cafea||'Single Origin',demo:meta.demo===true,image:typeof meta.imagine_produs==='string'&&/^[a-z0-9-]+\.(webp|png|svg)$/.test(meta.imagine_produs)?meta.imagine_produs:undefined,unit:meta.unitate||'',accessoryCategory:meta.categorie_accesoriu||'',specifications:meta.specificatii&&typeof meta.specificatii==='object'?Object.fromEntries(Object.entries(meta.specificatii).filter(([,v])=>typeof v==='string')) as Record<string,string>:{},care:meta.intretinere||''};
 });}
export function filterCatalog(coffees:Coffee[],filters:CatalogFilters,aromatic='Toate'){
 const terms=normalized(filters.search).split(/\s+/).filter(Boolean);
 return coffees.filter(c=>{
  const accessory=isUnitProduct(c);
  if(filters.type==='tasting'&&!isTastingSet(c))return false;
  if(filters.type==='coffee'&&accessory||filters.type==='accessory'&&!isAccessory(c))return false;
  if(filters.accessoryCategory!=='all'&&c.accessoryCategory!==filters.accessoryCategory)return false;
  if(accessory&&(aromatic!=='Toate'||['origin','roast','process','note','acidity','weight','caffeine'].some(key=>filters[key as keyof CatalogFilters]!=='all')))return false;
  const searchable=normalized([c.name,c.origin,c.region,c.producer,c.farm,c.altitude,...(c.varieties||[]),c.process,c.roast,...c.notes,...c.methods,c.kind,c.accessoryCategory,...Object.values(c.specifications||{}),c.lot,c.decaf?'decofeinizata decaf':''].join(' '));
  if(!terms.every(t=>searchable.includes(t)))return false;
  if(aromatic==='Fructat & floral'&&c.flavor!==1||aromatic==='Ciocolatiu & dulce'&&c.flavor!==-1||aromatic==='Echilibrat'&&c.flavor!==0)return false;
  if(filters.origin!=='all'&&c.origin!==filters.origin||filters.method!=='all'&&!c.methods.includes(filters.method)||filters.roast!=='all'&&c.roast!==filters.roast||filters.process!=='all'&&c.process!==filters.process||filters.note!=='all'&&!c.notes.includes(filters.note)||filters.acidity!=='all'&&c.acidity!==Number(filters.acidity))return false;
  if(filters.caffeine==='decaf'&&!c.decaf||filters.caffeine==='regular'&&c.decaf)return false;
  const variants=c.variants||[{id:'demo-small',weight:250,price:c.price,stock:24},{id:'demo-large',weight:1000,price:c.large,stock:8}];
  // Compară prețurile pentru gramajul ales; implicit, 250 g când acesta există.
  const candidates=filters.weight==='all'?variants.filter(v=>v.weight===(variants.some(v=>v.weight===250)?250:variants[0]?.weight)):variants.filter(v=>v.weight===Number(filters.weight));
  return candidates.some(v=>(!filters.inStock||v.stock>0)&&(filters.minPrice===''||v.price>=Number(filters.minPrice))&&(filters.maxPrice===''||v.price<=Number(filters.maxPrice)));
 });
}
