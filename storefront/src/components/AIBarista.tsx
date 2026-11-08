import React,{useEffect,useRef,useState} from 'react';
import type {Coffee,Brew,Profile,JournalEntry} from '../domain';
import {api,askAI,type AIReply,type AIStatus} from '../services/api';
type Message={role:'user'|'assistant';text:string;reply?:AIReply};
export function AIBarista({coffees,brew,profile,entries,journalAvailable,onProduct}:{coffees:Coffee[];brew:Brew;profile:Profile|null;entries:JournalEntry[];journalAvailable:boolean;onProduct:(coffee:Coffee)=>void}){
 const [status,setStatus]=useState<AIStatus|null>(null),[checking,setChecking]=useState(true),[error,setError]=useState(''),[pending,setPending]=useState(false),[share,setShare]=useState(false),[question,setQuestion]=useState('');
 const [messages,setMessages]=useState<Message[]>([{role:'assistant',text:'Bun venit. Găsim împreună cafeaua potrivită și ajustăm rețeta pentru ritualul tău. Dacă vrei să discutăm despre preparările anterioare, poți include ultimele degustări din jurnal.'}]);
 const bottom=useRef<HTMLDivElement>(null),inFlight=useRef(false);
 async function check(){setChecking(true);setError('');try{setStatus(await api<AIStatus>('status'));}catch{setStatus(null);setError('Barista nu este disponibil momentan. Încearcă din nou în câteva minute.');}finally{setChecking(false);}}
 useEffect(()=>{void check();},[]);useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'});},[messages,pending]);
 async function send(text=question){if(!text.trim()||inFlight.current||!status?.aiConfigured)return;const message=text.trim(),history=messages.slice(1).map(m=>({role:m.role,text:m.text}));setMessages(m=>[...m,{role:'user',text:message}]);setQuestion('');setError('');inFlight.current=true;setPending(true);
  try{const reply=await askAI(message,history,brew,share);setMessages(m=>[...m,{role:'assistant',text:reply.message,reply}]);}catch(e){setError(e instanceof Error?e.message:'Nu am primit un răspuns. Încearcă din nou.');setQuestion(message);}finally{inFlight.current=false;setPending(false);}
 }
 const ready=status?.aiConfigured===true,provider=status?.provider==='groq'?'Groq':status?.provider==='gemini'?'Google Gemini':'OpenAI';
 return <><div className="chat-header"><span className="chat-icon">✳</span><div><h2 id="dialog-title">Barista de acasă</h2><p>AI · CAFEA PE GUSTUL TĂU</p></div></div>
 {!checking&&!ready&&<div className="ai-config-note">Barista nu este disponibil momentan.<button onClick={()=>void check()}>Încearcă din nou</button></div>}
 {checking&&<p className="ai-data-note" role="status">Se conectează Barista…</p>}
 <div className="chat-messages" aria-live="polite">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><span>{m.text}</span>{m.reply?.coffeeIds.map(id=>{const c=coffees.find(c=>c.id===id);return c?<button className="ai-coffee-card" key={id} onClick={()=>onProduct(c)}><b>{c.name}</b><small>{c.notes.join(' · ')}</small><span>De la {c.price} lei · Vezi cafeaua ↗</span></button>:null;})}</div>)}{pending&&<div className="message assistant pending" role="status">Barista îți pregătește răspunsul<span>···</span></div>}<div ref={bottom}/></div>
 {error&&<div className="ai-error" role="alert">{error}</div>}
 <label className="journal-consent"><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)} disabled={pending||!journalAvailable}/>{journalAvailable?'Include ultimele degustări din jurnal':'Autentifică-te pentru a include jurnalul personal'}</label><p className="ai-data-note">{status?.provider==='ollama'?'Conversația este procesată local.':`Mesajul, conversația, profilul de gust și rețeta sunt procesate prin ${provider}.`} Jurnalul este inclus doar cu acordul tău. În Brew Lab te ghidez prin indicii, fără o rețetă completă de copiat.</p>
 <div className="quick-questions">{['Ce cafea îmi recomanzi?','Cum ajustez rețeta activă?','Compară ultimele degustări'].map(q=><button key={q} disabled={!ready||pending} onClick={()=>void send(q)}>{q}</button>)}</div><form className="chat-input" onSubmit={e=>{e.preventDefault();void send();}}><label className="sr-only" htmlFor="barista-question">Mesaj pentru Barista</label><input id="barista-question" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Întreabă ceva despre cafeaua ta…" maxLength={1200} disabled={pending}/><button type="submit" aria-label="Trimite mesajul" disabled={!question.trim()||!ready||pending}>→</button></form></>;
}

