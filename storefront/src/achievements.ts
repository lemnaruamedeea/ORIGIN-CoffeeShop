import type {Coffee,JournalEntry} from './domain';

export const achievements=[
 {id:'duel',name:'Primul duel',description:'Completează Coffee Duel și descoperă-ți profilul de gust.',icon:'✳'},
 {id:'brew-balanced',name:'În echilibru',description:'Rezolvă provocarea din Brew Lab.',icon:'◒'},
 {id:'first-tasting',name:'Prima pagină',description:'Salvează prima degustare în jurnal.',icon:'✎'},
 {id:'three-origins',name:'Trei descoperiri',description:'Înregistrează trei cafele diferite în jurnal.',icon:'◎'},
 {id:'five-tastings',name:'Ritual în formare',description:'Adună cinci degustări în jurnal.',icon:'☕'},
 {id:'ten-tastings',name:'Jurnal de cunoscător',description:'Adună zece degustări în jurnal.',icon:'✦'},
 {id:'six-coffees',name:'Colecționar de arome',description:'Înregistrează șase cafele diferite.',icon:'❋'},
 {id:'three-countries',name:'Dincolo de granițe',description:'Degustă cafele single origin din trei țări.',icon:'⊕'},
 {id:'six-countries',name:'Pașaport cu povești',description:'Degustă cafele single origin din șase țări.',icon:'✈'},
 {id:'decaf-tasting',name:'Plăcere fără grabă',description:'Salvează o degustare de cafea decofeinizată.',icon:'☾'},
 {id:'recipe-explorer',name:'O variabilă, o poveste',description:'Compară în jurnal două rețete diferite ale aceleiași cafele.',icon:'⚗'},
 {id:'first-review',name:'Vocea comunității',description:'Publică prima recenzie de produs.',icon:'☆'},
] as const;

export function journalAchievements(entries:JournalEntry[],coffees:Coffee[]):string[]{
 const known=new Map(coffees.filter(c=>c.kind!=='Accesoriu'&&c.kind!=='Set degustare').map(c=>[c.id,c]));
 const tasted=entries.filter(e=>known.has(e.coffeeId));
 const ids=new Set(tasted.map(e=>e.coffeeId));
 const countries=new Set(tasted.map(e=>known.get(e.coffeeId)!).filter(c=>c.kind!=='Blend'&&c.countryCode&&c.countryCode!=='MIX').map(c=>c.countryCode));
 const recipes=new Map<string,Set<string>>();
 for(const e of tasted){const set=recipes.get(e.coffeeId)||new Set<string>();set.add([e.dose,e.ratio,e.temperature,e.grind,e.filter||'paper'].join(':'));recipes.set(e.coffeeId,set);}
 return [
  entries.length>=1&&'first-tasting',ids.size>=3&&'three-origins',entries.length>=5&&'five-tastings',
  entries.length>=10&&'ten-tastings',ids.size>=6&&'six-coffees',countries.size>=3&&'three-countries',
  countries.size>=6&&'six-countries',tasted.some(e=>known.get(e.coffeeId)?.decaf)&&'decaf-tasting',
  [...recipes.values()].some(values=>values.size>=2)&&'recipe-explorer',
 ].filter((id):id is string=>typeof id==='string');
}
