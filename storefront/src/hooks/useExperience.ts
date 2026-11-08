import {cleanFavorites,mergeFavorites} from '../../../backend/src/lib/origin-favorites.ts';
import {useEffect,useRef,useState,type SetStateAction} from 'react';
import {api,ApiError,saveExperience,type Customer,type Experience,type SessionSnapshot} from '../services/api';
const empty=():Experience=>({profile:null,entries:[],badges:[],favorites:[]});
const guestKey='origin.guest.experience.v2';
function guestCache():Experience{
 try{const cached=JSON.parse(localStorage.getItem(guestKey)||'null');return cached&&Array.isArray(cached.entries)&&Array.isArray(cached.badges)?{...cached,favorites:cleanFavorites(cached.favorites)}:{profile:JSON.parse(localStorage.getItem('origin.profile')||'null'),entries:JSON.parse(localStorage.getItem('origin.journal')||'[]'),badges:JSON.parse(localStorage.getItem('origin.badges')||'[]'),favorites:[]};}catch{return empty();}
}
function clearGuestCache(){try{for(const key of [guestKey,'origin.profile','origin.journal','origin.badges'])localStorage.removeItem(key);}catch{}}
function broadcast(){try{localStorage.setItem('origin.auth.event',crypto.randomUUID());}catch{}}
function combineGuest(server:Experience|null,local:Experience):Experience{
 const a=server||empty(),entries=new Map([...a.entries,...local.entries].map(e=>[e.id,e]));
 return {profile:a.profile||local.profile,entries:[...entries.values()],badges:[...new Set([...a.badges,...local.badges])],favorites:mergeFavorites(a.favorites,local.favorites)};
}
export function useExperience(){
 const [data,setData]=useState<Experience>(empty),[customer,setCustomer]=useState<Customer|null>(null);
 const [ready,setReady]=useState(false),[sync,setSync]=useState<'loading'|'saved'|'saving'|'offline'|'conflict'>('loading');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[authError,setAuthError]=useState('');
 const dataRef=useRef(data),customerRef=useRef(customer),readyRef=useRef(ready),busyRef=useRef(busy);
 dataRef.current=data;customerRef.current=customer;readyRef.current=ready;busyRef.current=busy;
 const generation=useRef(0),owner=useRef(''),revision=useRef<string|null>(null),last=useRef('');
 const writes=useRef<Promise<void>>(Promise.resolve());
 function install(snapshot:SessionSnapshot){
  const next=snapshot.customer?{...(snapshot.data||empty()),favorites:cleanFavorites(snapshot.data?.favorites)}:combineGuest(snapshot.data,guestCache());
  owner.current=snapshot.owner;revision.current=snapshot.revision;last.current=JSON.stringify(next);
  dataRef.current=next;customerRef.current=snapshot.customer;readyRef.current=true;
  setData(next);setCustomer(snapshot.customer);setReady(true);setSync('saved');setError('');
  if(snapshot.customer)clearGuestCache();
 }
 async function reload(){
  const epoch=++generation.current;readyRef.current=false;setReady(false);setSync('loading');
  try{const snapshot=await api<SessionSnapshot>('session');if(epoch===generation.current)install(snapshot);}
  catch(e){if(epoch!==generation.current)return;if(e instanceof ApiError&&e.status===401){dataRef.current=empty();customerRef.current=null;owner.current='';setData(empty());setCustomer(null);clearGuestCache();}setError(e instanceof Error?e.message:'Datele nu au putut fi încărcate.');setSync('offline');}
 }
 function persist(snapshot:Experience){
  const epoch=generation.current,expectedOwner=owner.current,encoded=JSON.stringify(snapshot);
  const operation=writes.current.catch(()=>{}).then(async()=>{
   if(epoch!==generation.current||!readyRef.current||expectedOwner!==owner.current||encoded===last.current)return;
   setSync('saving');
   const result=await saveExperience(customerRef.current?snapshot:{...snapshot,entries:[]},expectedOwner,revision.current);
   if(epoch!==generation.current)return;
   revision.current=result.revision;last.current=encoded;setSync(JSON.stringify(dataRef.current)===encoded?'saved':'saving');setError('');
  });
  writes.current=operation;
  return operation.catch(e=>{
   if(epoch===generation.current){setError(e instanceof Error?e.message:'Salvarea nu a reușit.');setSync(e instanceof ApiError&&e.status===409?'conflict':'offline');
    if(e instanceof ApiError&&(e.status===409||e.status===401)){readyRef.current=false;setReady(false);if(e.status===401){generation.current++;dataRef.current=empty();customerRef.current=null;owner.current='';setData(empty());setCustomer(null);clearGuestCache();}}}
   throw e;
  });
 }
 async function flush(){await writes.current.catch(()=>{});if(readyRef.current&&JSON.stringify(dataRef.current)!==last.current)await persist(dataRef.current);}
 async function signIn(kind:'login'|'register',fields:{email:string;password:string;firstName?:string;lastName?:string;phone?:string}){
  if(busyRef.current)return false;busyRef.current=true;setBusy(true);setAuthError('');
  try{
   await flush();const guestExperience=customerRef.current?undefined:dataRef.current;
   generation.current++;readyRef.current=false;setReady(false);
   await api('account/'+kind,{method:'POST',body:JSON.stringify({...fields,guestExperience})});
   clearGuestCache();await reload();broadcast();return !!customerRef.current;
  }catch(e){setAuthError(e instanceof Error?e.message:'Autentificarea nu a reușit.');if(!owner.current||!customerRef.current){await reload();}else{readyRef.current=true;setReady(true);}return false;}
  finally{busyRef.current=false;setBusy(false);}
 }
 async function signOut(){
  if(busyRef.current)return false;busyRef.current=true;setBusy(true);setAuthError('');
  try{await flush();await api('account/logout',{method:'POST',body:'{}'});generation.current++;clearGuestCache();dataRef.current=empty();customerRef.current=null;setData(empty());setCustomer(null);await reload();broadcast();return true;}
  catch(e){setAuthError(e instanceof Error?e.message:'Deconectarea nu a reușit. Reîncearcă.');return false;}
  finally{busyRef.current=false;setBusy(false);}
 }
 async function changeAccount(method:'PATCH'|'DELETE'|'POST',body:unknown,path='account/profile'){
  if(busyRef.current)return false;busyRef.current=true;setBusy(true);setAuthError('');
  try{await flush();await api(path,{method,body:JSON.stringify(body)});generation.current++;
   if(method==='DELETE'){clearGuestCache();dataRef.current=empty();customerRef.current=null;setData(empty());setCustomer(null);}
   await reload();broadcast();return true;
  }catch(e){setAuthError(e instanceof Error?e.message:'Contul nu a putut fi actualizat.');return false;}finally{busyRef.current=false;setBusy(false);}
 }
 useEffect(()=>{void reload();return()=>{generation.current++;};},[]);
 const encoded=JSON.stringify(data);
 useEffect(()=>{if(!ready||encoded===last.current)return;setSync('saving');const epoch=generation.current,expectedOwner=owner.current;const timer=setTimeout(()=>{if(epoch===generation.current&&expectedOwner===owner.current)void persist(JSON.parse(encoded)).catch(()=>{});},550);return()=>clearTimeout(timer);},[encoded,ready]);
 useEffect(()=>{if(ready&&!customer){try{localStorage.setItem(guestKey,encoded);}catch{}}},[encoded,ready,customer]);
 useEffect(()=>{
  const focus=()=>{if(!busyRef.current&&readyRef.current&&JSON.stringify(dataRef.current)===last.current)void reload();};
  const storage=(event:StorageEvent)=>{if(event.key==='origin.auth.event'&&!busyRef.current)void reload();};
  window.addEventListener('focus',focus);window.addEventListener('storage',storage);
  return()=>{window.removeEventListener('focus',focus);window.removeEventListener('storage',storage);};
 },[]);
 function update<K extends keyof Experience>(key:K,value:SetStateAction<Experience[K]>){setData(current=>({...current,[key]:typeof value==='function'?(value as (old:Experience[K])=>Experience[K])(current[key]):value}));}
 return {data,customer,ready,sync,busy,error,authError,reload,signIn,signOut,updateAccount:(fields:{firstName:string;lastName:string;phone:string;email:string;password:string})=>changeAccount('PATCH',fields),changePassword:(password:string,newPassword:string,confirmation:string)=>changeAccount('POST',{password,newPassword,confirmation},'account/password'),removeAccount:(password:string,confirmation:string)=>changeAccount('DELETE',{password,confirmation}),setFavorites:(v:SetStateAction<Experience['favorites']>)=>update('favorites',v),setProfile:(v:SetStateAction<Experience['profile']>)=>update('profile',v),setEntries:(v:SetStateAction<Experience['entries']>)=>update('entries',v),setBadges:(v:SetStateAction<Experience['badges']>)=>update('badges',v)};
}
