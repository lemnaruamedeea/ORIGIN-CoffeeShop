import React from 'react';
import {brewProfile,brewReference,brewTime,type Coffee,type Brew} from '../domain';
import '../brewing.css';
export function BrewReference({coffee,brew,onApply}:{coffee:Coffee;brew:Brew;onApply:()=>void}){
 const p=brewProfile(coffee),ref=brewReference(coffee,brew.dose),seconds=brewTime(coffee,brew.dose);
 return <div className="brew-reference" aria-label={`Rețeta de referință pentru ${coffee.name}`}><span className="eyebrow">REPERUL ACESTEI CAFELE / V60</span><h3>{coffee.name}</h3><p>{p.reason}</p><dl><div><dt>Temperatură</dt><dd>{ref.temperature} °C</dd></div><div><dt>Raport</dt><dd>1:{ref.ratio}</dd></div><div><dt>Măcinătură</dt><dd>{ref.grind}/100</dd></div><div><dt>Timp orientativ</dt><dd>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</dd></div></dl><small>Repere pentru doza ta de {brew.dose} g · {Math.round(brew.dose*ref.ratio)} g apă. Scara de măcinătură este relativă: 0 fină, 100 grosieră.</small>{p.preferredMethod!=='V60'&&<small>Metoda preferată a lotului: {p.preferredMethod}. Aceste valori descriu varianta sa la V60.</small>}<button type="button" className="text-link" onClick={onApply}>Aplică rețeta recomandată · {p.dose} g →</button></div>;
}
