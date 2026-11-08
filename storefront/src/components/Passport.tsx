import React from 'react';
import {MysteryTasting} from './MysteryTasting';
import type {Coffee,JournalEntry} from '../domain';
import {OriginMap} from './OriginMap';
import {achievements} from '../achievements';
export function Passport({coffees,entries,badges,onBrew,authenticated,onSignIn,onShop}:{coffees:Coffee[];entries:JournalEntry[];badges:string[];onBrew:(coffeeId:string)=>void;authenticated:boolean;onSignIn:()=>void;onShop:()=>void}){
  return <section className="passport-page section-pad"><div className="page-intro"><div className="eyebrow">PAȘAPORT / CURIOZITATE ÎN MIȘCARE</div><h1>O lume de origini.<br/><em>Un traseu al tău.</em></h1><p>Provocările arată ce ai învățat. Jurnalul păstrează ce ai gustat.</p></div><OriginMap coffees={coffees} entries={entries} onBrew={onBrew}/><div className="achievement-progress"><b>{achievements.filter(b=>badges.includes(b.id)).length} / {achievements.length} insigne deblocate</b><progress aria-label="Progresul insignelor" max={achievements.length} value={achievements.filter(b=>badges.includes(b.id)).length}/><p>Salvează degustări și explorează cafele noi. Insignele câștigate rămân în pașaportul tău.</p></div><div className="badge-grid">{achievements.map(b=><article className={`achievement ${badges.includes(b.id)?'unlocked':''}`} key={b.id}><span>{b.icon}</span><h3>{b.name}</h3><p>{b.description}</p><small>{badges.includes(b.id)?'✓ Deblocată':'De explorat'}</small></article>)}</div><MysteryTasting key={String(authenticated)} authenticated={authenticated} onSignIn={onSignIn} onShop={onShop} onBrew={onBrew}/></section>;
}
