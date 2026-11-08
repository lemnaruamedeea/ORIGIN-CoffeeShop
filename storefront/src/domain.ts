import {rankDuelCoffees,type DuelProfile} from '../../backend/src/lib/coffee-duel.ts';
import {neutralBrew} from '../../backend/src/lib/brew-exploration.ts';
import {brewReference,evaluateBrew} from '../../backend/src/lib/coffee-brewing.ts';
export {brewProfile,brewReference,brewTime,challengeBrew} from '../../backend/src/lib/coffee-brewing.ts';
export type Variant = {id:string;weight:number;price:number;stock:number};
export type Coffee = { id: string; name: string; origin: string; region: string; notes: string[]; price: number; large: number; color: string; roast: string; process: string; flavor: number; acidity: number; methods: string[]; description: string; variants?:Variant[]; countryCode?:string;producer?:string;farm?:string;altitude?:string;varieties?:string[];harvest?:string;roaster?:string;lot?:string;decaf?:boolean;kind?:string;body?:number;demo?:boolean;unit?:string;accessoryCategory?:string;specifications?:Record<string,string>;care?:string;image?:string };
export const coffees: Coffee[] = [
  {id:'ethiopia-guji',name:'Ethiopia Guji',origin:'Etiopia',region:'Guji',notes:['Iasomie','Piersică','Bergamotă'],price:65,large:225,color:'#a45e3b',roast:'Prăjire light',process:'Naturală',flavor:1,acidity:3,methods:['V60','AeroPress'],description:'O cafea delicată, florală și luminoasă. Pentru diminețile în care ai chef să descoperi ceva nou.'},
  {id:'brazil-santos',name:'Brazil Santos',origin:'Brazilia',region:'São Paulo',notes:['Ciocolată','Alune','Caramel'],price:48,large:165,color:'#68715b',roast:'Prăjire medium',process:'Naturală',flavor:-1,acidity:1,methods:['Espresso','Moka'],description:'Rotundă și reconfortantă, cu dulceață de caramel și note de alune. Un început familiar în lumea cafelei de specialitate.'},
  {id:'colombia-huila',name:'Colombia Huila',origin:'Columbia',region:'Huila',notes:['Portocală','Caramel','Cacao'],price:58,large:198,color:'#8a6452',roast:'Prăjire medium-light',process:'Spălată',flavor:0,acidity:2,methods:['Espresso','V60'],description:'La mijloc între familiar și surprinzător. Cacao și caramel, cu o notă proaspătă de portocală.'},
];
export type Profile = DuelProfile;
export type Brew = { coffeeId: string; dose: number; ratio: number; temperature: number; grind: number;water?:number;filter?:'paper'|'dense-paper'|'metal'|'cloth' };
export type JournalEntry = Brew & {id:string;date:string;rating:number;taste:string;note:string};
export const defaultBrew: Brew = neutralBrew(coffees[0].id);
export function recommend(profile: Profile, entries: JournalEntry[] = [],catalog:Coffee[]=coffees): Coffee[] {
  if(profile.version===2)return rankDuelCoffees(catalog,profile,entries);
  const feedbackScore = (id: string) => {
    const ratings=entries.filter(e=>e.coffeeId===id);
    return ratings.length ? (ratings.reduce((s,e)=>s+e.rating,0)/ratings.length-3)*2 : 0;
  };
  return [...catalog].filter(c=>!c.variants||c.variants.some(v=>v.stock>0)).sort((a,b)=>(score(b,profile)+feedbackScore(b.id))-(score(a,profile)+feedbackScore(a.id)));
}
function score(c:Coffee,p:Profile) {return 8-Math.abs(c.flavor-p.flavor)*2-Math.abs(c.acidity-p.acidity)+(c.methods.includes(p.method)?3:0)+(p.milk&&c.flavor===-1?2:0);}
export function brewFeedback(b:Brew,coffee?:Coffee){
 return evaluateBrew(b,coffee||coffees.find(c=>c.id===b.coffeeId)||{id:b.coffeeId});
}
export function demoReply(question:string,entries:JournalEntry[],brew:Brew,profile:Profile|null,catalog:Coffee[]=coffees):string {
  const q=question.toLocaleLowerCase('ro'); const last=entries[0]; const coffee=catalog.find(c=>c.id===(last?.coffeeId||brew.coffeeId))||catalog[0]||coffees[0];
  if(/ac[iî]|acr|sour/.test(q))return `Pentru ${coffee.name}, aș verifica mai întâi dacă este o aciditate plăcută sau un gust acru, neplăcut. Ca experiment, păstrează doza și raportul și încearcă o măcinătură puțin mai fină. Salvează rezultatul în jurnal pentru comparație. Aceasta este o sugestie demonstrativă, nu un diagnostic al extracției.`;
  if(/amar|bitter/.test(q))return `Încearcă o măcinătură puțin mai grosieră, păstrând restul rețetei. Compară noua preparare cu cea anterioară. ${last?`Ultima ta înregistrare pentru ${coffee.name} are ${last.rating}/5.`:'Nu ai încă o preparare în jurnal.'} Acest răspuns folosește reguli locale demonstrative.`;
  if(/recomand|aleg|lapte|ciocolat/.test(q)) {const available=profile?recommend(profile,entries,catalog):catalog.filter(c=>!c.variants||c.variants.some(v=>v.stock>0));const c=available.find(c=>!profile&&c.id==='brazil-santos')||available[0];if(!c)return 'Cafelele din catalog nu sunt disponibile momentan. Revino după actualizarea stocului.';return `Aș începe cu ${c.name}: ${c.notes.join(', ').toLowerCase()}, de la ${c.price} lei / 250 g. ${profile?'Alegerea se bazează pe profilul tău din Coffee Duel și pe evaluările salvate în jurnal.':'Completează Coffee Duel pentru o recomandare bazată pe preferințele tale.'} Catalogul și prețurile sunt demonstrative.`;}
  if(/jurnal|ultima|ultim|încerc|incerc/.test(q))return last?`Ultima preparare: ${coffee.name}, ${last.dose} g, raport 1:${last.ratio}, ${last.temperature} °C. Ai notat „${last.taste}” și ${last.rating}/5.${last.note?` Observația ta: „${last.note}”.`:''} La următoarea încercare schimbă o singură variabilă, ca să poți compara.`:'Jurnalul tău este încă gol. Deschide Brew Lab, pregătește o rețetă și salvează o degustare reală. Voi putea apoi să îți rezum ultima înregistrare.';
  return 'Sunt în modul demonstrativ: folosesc catalogul, profilul și ultima înregistrare din jurnal, prin reguli locale. Întreabă-mă „Ce cafea îmi recomanzi?”, „Cafeaua este prea amară” sau „Ce am notat ultima dată?”. Conectarea la un serviciu AI real este o etapă separată.';
}
