import React from 'react';
import type {Coffee} from '../domain';
import type {CatalogFilters} from '../catalog';
export function CatalogControls({coffees,filters,onChange,onReset}:{coffees:Coffee[];filters:CatalogFilters;onChange:(value:CatalogFilters)=>void;onReset:()=>void}){
 const allProducts=coffees;coffees=coffees.filter(c=>c.kind!=='Accesoriu'&&c.kind!=='Set degustare');
 const accessoryOnly=['accessory','tasting'].includes(filters.type);
 const options=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ro'));
 const field=(key:keyof CatalogFilters,label:string,values:[string,string][])=> <label className="catalog-filter" key={key}>{label}<select aria-label={label} value={String(filters[key])} onChange={e=>onChange({...filters,[key]:e.target.value})}><option value="all">Toate</option>{values.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>;
 return <div className="catalog-controls"><div className="catalog-search"><label htmlFor="catalog-search">Caută un produs</label><input id="catalog-search" type="search" value={filters.search} onChange={e=>onChange({...filters,search:e.target.value})} placeholder="Cafea, accesoriu, producător sau compatibilitate…" maxLength={150}/><button className="text-link" onClick={onReset}>Resetează filtrele ↺</button></div><details className="catalog-filter-panel"><summary>Rafinează descoperirea <span>Preparare, specificații, disponibilitate și preț</span></summary><div className="catalog-filter-grid">
 {!['coffee','tasting'].includes(filters.type)&&field('accessoryCategory','Tip de accesoriu',options(allProducts.filter(c=>c.kind==='Accesoriu').map(c=>c.accessoryCategory||'')).map(v=>[v,v]))}
 {!accessoryOnly&&<>
 {field('origin','Origine',options(coffees.map(c=>c.origin)).map(v=>[v,v]))}
 {field('roast','Prăjire',options(coffees.map(c=>c.roast)).map(v=>[v,v.replace('Prăjire ', '')]))}
 {field('process','Procesare',options(coffees.map(c=>c.process)).map(v=>[v,v]))}
 {field('note','Notă aromatică',options(coffees.flatMap(c=>c.notes)).map(v=>[v,v]))}
 {field('acidity','Aciditate',[['1','Redusă'],['2','Medie'],['3','Ridicată']])}
 {field('weight','Gramaj',[['250','250 g'],['1000','1 kg']])}
 {field('caffeine','Cofeină',[['regular','Cu cofeină'],['decaf','Decofeinizată']])}
 </>}
 {field('method','Preparare',options(allProducts.flatMap(c=>c.methods)).map(v=>[v,v]))}
 <label className="catalog-filter">Preț minim (lei)<input type="number" min="0" step="1" value={filters.minPrice} onChange={e=>onChange({...filters,minPrice:e.target.value})} placeholder="0"/></label><label className="catalog-filter">Preț maxim (lei)<input type="number" min="0" step="1" value={filters.maxPrice} onChange={e=>onChange({...filters,maxPrice:e.target.value})} placeholder="Fără limită"/></label>
 <label className="catalog-stock-filter"><input type="checkbox" checked={filters.inStock} onChange={e=>onChange({...filters,inStock:e.target.checked})}/>Doar produse în stoc</label></div><p>Pentru cafea comparăm gramajul ales sau pachetul de 250 g; accesoriile au preț per bucată sau set. Notele aromatice descriu gustul, nu ingrediente adăugate.</p></details></div>;
}
