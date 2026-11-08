// Educational pour-over simulation. These are model coefficients, not measured extraction data.
export const brewFilters=[
 {id:'paper',name:'Hârtie',description:'Ceașcă limpede, textură mai lejeră.',flow:2.8,grindOffset:0,ratioOffset:0,temperatureOffset:0,color:'#f5ecda'},
 {id:'dense-paper',name:'Hârtie densă',description:'Trecere mai lentă a apei, filtrare fină.',flow:1.8,grindOffset:7,ratioOffset:.3,temperatureOffset:1,color:'#dcc8a3'},
 {id:'metal',name:'Metal reutilizabil',description:'Mai mult corp; lasă să treacă uleiuri și particule fine.',flow:4.2,grindOffset:12,ratioOffset:-.3,temperatureOffset:-1,color:'#aab5a1'},
 {id:'cloth',name:'Textil',description:'Textură rotundă, filtrare intermediară.',flow:2.4,grindOffset:4,ratioOffset:.2,temperatureOffset:0,color:'#ded9bc'},
] as const;
export type BrewFilter=typeof brewFilters[number]['id'];
export type ExplorationBrew={coffeeId:string;dose:number;ratio:number;temperature:number;grind:number;water?:number;filter?:BrewFilter};
export type FlowState={elapsed:number;poured:number;drained:number;absorbed:number;bed:number;done:boolean};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const brewLimits={minWater:0,maxWater:1500};
export function filterFor(id?:string){return brewFilters.find(f=>f.id===id)||brewFilters[0];}
export function waterFor(b:ExplorationBrew){return Math.round(clamp(Number.isFinite(b.water)?b.water!:b.dose*b.ratio,0,1500));}
export function normalizeExploration(b:ExplorationBrew):ExplorationBrew{const dose=clamp(Number.isFinite(b.dose)?b.dose:20,12,30),water=waterFor({...b,dose});return {...b,dose,water,ratio:water/dose,filter:filterFor(b.filter).id,temperature:clamp(b.temperature,80,100),grind:clamp(b.grind,0,100)};}
export function neutralBrew(coffeeId:string):ExplorationBrew{return {coffeeId,dose:20,water:0,ratio:0,temperature:90,grind:55,filter:'paper'};}
export const emptyFlow=():FlowState=>({elapsed:0,poured:0,drained:0,absorbed:0,bed:0,done:false});
export function advanceFlow(previous:FlowState,b:ExplorationBrew,dt:number):FlowState{
 const water=waterFor(b);if(!water)return {...previous,done:true};
 const delta=clamp(dt,0,1),elapsed=previous.elapsed+delta,capacity=100;
 const bloom=Math.min(water,b.dose*2),waiting=previous.poured>=bloom&&elapsed<20;
 const addition=waiting?0:Math.min(Math.max(0,water-previous.poured),14*delta,Math.max(0,capacity-previous.bed));
 const poured=previous.poured+addition,absorbed=Math.min(poured,b.dose*2);
 const available=Math.max(0,poured-absorbed-previous.drained);
 const rate=filterFor(b.filter).flow*(.45+b.grind/65)*(.8+(b.temperature-80)/65);
 const drained=previous.drained+Math.min(available,rate*delta*Math.min(1,available/10));
 const bed=Math.max(0,poured-absorbed-drained),done=poured>=water-.001&&bed<.2;
 return {elapsed,poured,absorbed,drained:done?Math.max(0,poured-absorbed):drained,bed:done?0:bed,done};
}
export function explorationFeedback(b:ExplorationBrew,profile:{ratio:number;temperature:number;grind:number;dose:number}){
 if(!waterFor(b))return {tone:'empty',title:'Încă nu ai adăugat apă',text:'Alege o cantitate de apă pentru a putea compara o preparare.',position:50};
 const f=filterFor(b.filter),ratio=waterFor(b)/b.dose;
 const differences=[
  {key:'temperature',delta:(b.temperature-profile.temperature-f.temperatureOffset)/1.5},
  {key:'ratio',delta:(ratio-profile.ratio-f.ratioOffset)/.45},
  {key:'grind',delta:(profile.grind+(b.dose-profile.dose)*.8+f.grindOffset-b.grind)/4},
 ];
 const balanced=differences.every(d=>Math.abs(d.delta)<=1),dominant=[...differences].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0];
 const hint=dominant.key==='temperature'?(dominant.delta<0?'Încearcă apă puțin mai caldă.':'Încearcă o temperatură puțin mai mică.'):dominant.key==='ratio'?(dominant.delta<0?'Încearcă puțin mai multă apă, păstrând doza.':'Încearcă puțin mai puțină apă, păstrând doza.'):dominant.delta<0?'Încearcă o măcinătură puțin mai fină.':'Încearcă o măcinătură puțin mai grosieră.';
 return {tone:balanced?'balanced':dominant.delta<0?'under':'over',title:balanced?'Ai găsit o zonă de echilibru':'Mai este loc de explorat',text:balanced?'Modelul sugerează o combinație echilibrată pentru cafeaua și filtrul ales. Gustul tău decide dacă o păstrezi.':`${hint} Schimbă o singură variabilă și compară cu încercarea precedentă.`,position:balanced?50:clamp(50+dominant.delta*12,5,95)};
}
