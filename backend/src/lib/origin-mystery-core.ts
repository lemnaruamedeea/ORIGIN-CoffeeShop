import {randomBytes,randomInt} from 'node:crypto';
export const MYSTERY_HANDLE='mystery-tasting-trio';
export const isMystery=(p:any)=>p?.id===MYSTERY_HANDLE||p?.metadata?.product_type==='tasting_set';
export type SampleCoffee={handle:string;variantId:string;stock:number;snapshot:any};
export function availableSets(pool:{stock:number}[]){
 let low=0,high=Math.floor(pool.reduce((n,c)=>n+Math.max(0,c.stock),0)/3);
 while(low<high){const mid=Math.ceil((low+high)/2);if(pool.reduce((n,c)=>n+Math.min(Math.max(0,c.stock),mid),0)>=3*mid)low=mid;else high=mid-1;}return low;
}
export function selectSamples(pool:SampleCoffee[],quantity:number,pick:(max:number)=>number=randomInt){
 if(!Number.isInteger(quantity)||quantity<1||quantity>5)throw Error('Select between one and five tasting sets.');
 const remaining=pool.map(c=>({...c,stock:Math.max(0,Math.floor(c.stock))})),chosen:any[]=[];
 for(let setIndex=1;setIndex<=quantity;setIndex++){
  const live=remaining.filter(c=>c.stock>0),options:SampleCoffee[][]=[];
  for(let i=0;i<live.length-2;i++)for(let j=i+1;j<live.length-1;j++)for(let k=j+1;k<live.length;k++){
   const triple=[live[i],live[j],live[k]],handles=new Set(triple.map(c=>c.handle));
   const after=remaining.map(c=>({stock:c.stock-(handles.has(c.handle)?1:0)}));
   if(availableSets(after)>=quantity-setIndex)options.push(triple);
  }
  if(!options.length)throw Error('Not enough distinct sample coffees.');
  const triple=[...options[pick(options.length)]];
  for(let i=triple.length-1;i>0;i--){const j=pick(i+1);[triple[i],triple[j]]=[triple[j],triple[i]];}
  triple.forEach((c,index)=>{c.stock--;chosen.push({setIndex,slot:index+1,coffee:c,code:'MS-'+randomBytes(9).toString('hex').toUpperCase()});});
 }
 return chosen;
}
