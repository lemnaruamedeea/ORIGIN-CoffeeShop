import {coffees as demoCoffees,type Coffee,type Brew,type Profile,type JournalEntry} from '../domain';
import {adaptCatalogProducts} from '../catalog';
export type Experience={profile:Profile|null;entries:JournalEntry[];badges:string[];favorites:string[]};
export type Customer={id:string;email:string;firstName:string;lastName?:string;phone?:string};
export type SessionSnapshot={data:Experience|null;customer:Customer|null;owner:string;revision:string|null};
export class ApiError extends Error{status:number;code:string;constructor(message:string,status:number,code:string){super(message);this.status=status;this.code=code;}}
export type AIRecipe=Brew&{reason:string};
export type AIReply={message:string;coffeeIds:string[];recipe:AIRecipe|null;mode:'ai'|'demo'};
export type AIStatus={aiConfigured:boolean;model:string;provider:string;keyConfigured?:boolean;liveEnabled?:boolean};
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch('/api/'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers},signal:options.signal||AbortSignal.timeout(path==='barista'?130000:15000)});
  const data=await response.json().catch(()=>({message:'Serverul nu a returnat un răspuns valid.'}));
  if(!response.ok)throw new ApiError(data.message||'Cererea nu a putut fi finalizată.',response.status,data.error||'request_failed');return data;
}
export const medusaCoffees=(products:any[]):Coffee[]=>adaptCatalogProducts(products,demoCoffees);
export const saveExperience=(data:Experience,owner:string,revision:string|null)=>api<{saved:boolean;revision:string}>('session',{method:'PUT',body:JSON.stringify({data,owner,revision})});
export const askAI=(message:string,history:{role:string;text:string}[],brew:Brew,shareJournal:boolean)=>api<AIReply>('barista',{method:'POST',body:JSON.stringify({message,history,brew,shareJournal})});
