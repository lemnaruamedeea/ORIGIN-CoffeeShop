// Preference game, not a sensory diagnosis. No brewing targets or external AI calls.
export type DuelProfile={flavor:number;acidity:number;milk:boolean;method:string;name:string;version?:2;archetypeId?:string;aroma?:string;body?:number;adventure?:number;caffeine?:'regular'|'decaf'|'either';drink?:'black'|'milk'|'plant';answers?:Record<string,string>};
type Choice={id:string;label:string;detail:string;symbol:string};
export const duelQuestions:{id:string;title:string;hint:string;options:Choice[]}[]=[
 {id:'aroma',title:'Ce arome te fac curios?',hint:'Alege familia care te atrage cel mai mult, chiar dacă nu ai mai găsit-o într-o cafea.',options:[
  {id:'cocoa',label:'Cacao & ciocolată',detail:'Confortabil, dulce, familiar.',symbol:'▧'},
  {id:'nuts',label:'Nuci & caramel',detail:'Alune, migdale, dulceață rotundă.',symbol:'◒'},
  {id:'fruit',label:'Fructe coapte',detail:'Piersici, prune sau fructe de pădure.',symbol:'◉'},
  {id:'citrus',label:'Citrice',detail:'Portocală, grapefruit, prospețime.',symbol:'✺'},
  {id:'floral',label:'Flori & ceai',detail:'Iasomie, bergamotă, arome fine.',symbol:'✿'},
  {id:'spice',label:'Condimente',detail:'Tonuri calde, cacao intensă, profunzime.',symbol:'✳'},
  {id:'balanced',label:'Puțin din toate',detail:'Un echilibru între dulce și fructat.',symbol:'◐'},
  {id:'surprise',label:'Surprinde-mă',detail:'Vreau să compar și să descopăr.',symbol:'✧'},
 ]},
 {id:'acidity',title:'Câtă prospețime vrei în ceașcă?',hint:'Aciditatea este prospețimea unui fruct. Nu înseamnă automat un gust acru.',options:[
  {id:'gentle',label:'Blândă',detail:'O ceașcă liniștită, cu aciditate redusă.',symbol:'◡'},
  {id:'medium',label:'La mijloc',detail:'Prospețime prezentă, alături de dulceață.',symbol:'◒'},
  {id:'bright',label:'Vie & luminoasă',detail:'Îmi place senzația suculentă a fructelor.',symbol:'☼'},
 ]},
 {id:'body',title:'Ce textură îți place?',hint:'Corpul descrie senzația cafelei în gură, nu cantitatea de cofeină.',options:[
  {id:'light',label:'Lejeră & clară',detail:'Delicată, apropiată de un ceai.',symbol:'≋'},
  {id:'round',label:'Rotundă',detail:'Textură plăcută, fără să fie grea.',symbol:'◔'},
  {id:'full',label:'Plină & catifelată',detail:'O ceașcă densă, cu prezență.',symbol:'●'},
 ]},
 {id:'drink',title:'Cum îți bei de obicei cafeaua?',hint:'Alegerea ajută la potrivirea aromelor, fără să te limiteze la o singură băutură.',options:[
  {id:'black',label:'Simplă',detail:'Vreau să descopăr cafeaua ca atare.',symbol:'◒'},
  {id:'milk',label:'Cu lapte',detail:'Cappuccino, latte sau doar un strop.',symbol:'◑'},
  {id:'plant',label:'Cu băutură vegetală',detail:'Ovăz, migdale sau ce îmi place mie.',symbol:'❧'},
 ]},
 {id:'method',title:'Cu ce o prepari?',hint:'Alegem cafele potrivite metodei tale; rețeta o explorezi separat în Brew Lab.',options:[
  {id:'espresso',label:'Espresso',detail:'O extracție scurtă, sub presiune.',symbol:'▰'},
  {id:'v60',label:'V60 / filtru',detail:'Turnare manuală și control asupra apei.',symbol:'▽'},
  {id:'aeropress',label:'AeroPress',detail:'Compact, flexibil, de experimentat.',symbol:'▤'},
  {id:'french',label:'French Press',detail:'Infuzie și filtru metalic.',symbol:'▥'},
  {id:'moka',label:'Moka',detail:'Ritualul de pe aragaz.',symbol:'⬡'},
  {id:'any',label:'Încă explorez',detail:'Nu am o metodă preferată.',symbol:'✧'},
 ]},
 {id:'adventure',title:'Cât de departe vrei să explorezi?',hint:'Poți prefera ceva familiar astăzi și ceva surprinzător data viitoare.',options:[
  {id:'familiar',label:'Confortul cunoscut',detail:'Vreau arome ușor de îndrăgit.',symbol:'⌂'},
  {id:'open',label:'Un pas mai departe',detail:'Îmi plac noutățile, într-o ceașcă echilibrată.',symbol:'↗'},
  {id:'bold',label:'Caut surprize',detail:'Sunt curios de procesări și arome expresive.',symbol:'✷'},
 ]},
 {id:'caffeine',title:'Cum preferi cofeina?',hint:'Respectăm această alegere și în recomandări. Decofeinizată nu înseamnă absența absolută a cofeinei.',options:[
  {id:'regular',label:'Cafea cu cofeină',detail:'Recomandă-mi cafelele obișnuite.',symbol:'☼'},
  {id:'decaf',label:'Decofeinizată',detail:'Vreau recomandări doar din gama decaf.',symbol:'☾'},
  {id:'either',label:'Sunt deschis la ambele',detail:'Aleg în primul rând după gust.',symbol:'◐'},
 ]},
];
export const duelArchetypes=[
 {id:'cocoa-comfort',name:'Confort de cacao',description:'Te atrag aromele de ciocolată și o ceașcă prietenoasă. Începem cu loturi care pun dulceața familiară în prim-plan.',symbol:'▧'},
 {id:'nutty-sweet',name:'Alune & caramel',description:'Cauți dulceață rotundă și arome de nuci. O cafea reconfortantă poate fi punctul tău de pornire.',symbol:'◒'},
 {id:'juicy-fruit',name:'Fructe în ceașcă',description:'Te atrag fructele coapte și aromele suculente. Merită să compari mai multe origini și procesări.',symbol:'◉'},
 {id:'citrus-bright',name:'Rază de citrice',description:'Portocala și grapefruitul îți stârnesc curiozitatea. Căutăm note citrice și prospețime în catalog.',symbol:'✺'},
 {id:'floral-notes',name:'Flori & ceai',description:'Aromele florale și notele de ceai sunt reperele tale. Lasă cafeaua să se răcească puțin și observă cum se schimbă.',symbol:'✿'},
 {id:'spice-depth',name:'Condimente & profunzime',description:'Preferi tonurile calde și aromele cu personalitate. Căutăm loturi cu condimente și note intense.',symbol:'✳'},
 {id:'daily-balance',name:'Echilibru de zi cu zi',description:'Îți place o întâlnire între dulce și fructat. O ceașcă echilibrată îți lasă loc să explorezi în ritmul tău.',symbol:'◐'},
 {id:'creamy-ritual',name:'Ritual catifelat',description:'Textura plină și băuturile cu lapte sau alternative vegetale fac parte din ritualul tău. Căutăm arome care să rămână prezente.',symbol:'◑'},
 {id:'clear-filter',name:'Claritate la filtru',description:'Îți place o textură lejeră și prepararea la filtru. Căutăm cafele care să se potrivească acestui stil, ținând cont și de aromele alese.',symbol:'▽'},
 {id:'curious-explorer',name:'Explorator de origini',description:'Îți place să descoperi. Compară loturi diferite și păstrează în jurnal surprizele care merită repetate.',symbol:'✧'},
 {id:'decaf-calm',name:'Arome în tihnă',description:'Preferi gama decofeinizată, păstrând aromele și textura care îți plac. Recomandările respectă această alegere.',symbol:'☾'},
] as const;
const aromaFlavor:Record<string,number>={cocoa:-1,nuts:-1,fruit:1,citrus:1,floral:1,spice:-1,balanced:0,surprise:0};
const methods:Record<string,string>={espresso:'Espresso',v60:'V60',aeropress:'AeroPress',french:'French Press',moka:'Moka',any:'Orice'};
export function buildDuelProfile(answers:Record<string,string>):DuelProfile{
 for(const q of duelQuestions)if(!q.options.some(o=>o.id===answers[q.id]))throw Error('Completează toate cele șapte întrebări.');
 const acidity={gentle:1,medium:2,bright:3}[answers.acidity]!,body={light:1,round:2,full:3}[answers.body]!,adventure={familiar:0,open:1,bold:2}[answers.adventure]!;
 let id: string={cocoa:'cocoa-comfort',nuts:'nutty-sweet',fruit:'juicy-fruit',citrus:'citrus-bright',floral:'floral-notes',spice:'spice-depth',balanced:'daily-balance',surprise:'curious-explorer'}[answers.aroma]!;
 if(answers.drink!=='black'&&body===3&&acidity<=2)id='creamy-ritual';
 else if(['v60','aeropress'].includes(answers.method)&&body===1&&acidity>=2&&adventure<2)id='clear-filter';
 if(answers.caffeine==='decaf')id='decaf-calm';
 const archetype=duelArchetypes.find(a=>a.id===id)!;
 return {version:2,archetypeId:id,name:archetype.name,flavor:aromaFlavor[answers.aroma],aroma:answers.aroma,acidity,body,adventure,milk:answers.drink!=='black',drink:answers.drink as DuelProfile['drink'],method:methods[answers.method],caffeine:answers.caffeine as DuelProfile['caffeine'],answers:Object.fromEntries(duelQuestions.map(q=>[q.id,answers[q.id]]))};
}
export function archetypeFor(p:DuelProfile){return duelArchetypes.find(a=>a.id===p.archetypeId);}
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const aromaWords:Record<string,string[]>={cocoa:['cacao','ciocolat'],nuts:['alune','migdale','nuci','caramel','martipan'],fruit:['piersic','prun','cais','coacaze','fruct'],citrus:['portocal','grapefruit','mandarin','bergamot'],floral:['iasomie','ceai','bergamot','flor'],spice:['condiment'],balanced:[],surprise:[]};
type CoffeeLike={id:string;name:string;flavor:number;acidity:number;body?:number;notes:string[];methods:string[];decaf?:boolean;kind?:string;process?:string;variants?:{stock:number}[]};
type Rating={coffeeId:string;rating:number};
function noteMatches(c:CoffeeLike,p:DuelProfile){return c.notes.filter(n=>(aromaWords[p.aroma||'']||[]).some(w=>normalize(n).includes(w)));}
export function duelScore(c:CoffeeLike,p:DuelProfile,entries:Rating[]=[]){
 const ratings=entries.filter(e=>e.coffeeId===c.id),journal=ratings.length?(ratings.reduce((n,e)=>n+e.rating,0)/ratings.length-3)*2:0;
 return 30-Math.abs(c.flavor-p.flavor)*5-Math.abs(c.acidity-p.acidity)*5-Math.abs((c.body||2)-(p.body||2))*4+Math.min(2,noteMatches(c,p).length)*7+(p.method!=='Orice'&&c.methods.includes(p.method)?12:0)+(p.milk&&c.flavor===-1?6:0)+((p.adventure||0)>=2&&/natural|anaerob|honey/i.test(c.process||'')?5:0)+journal;
}
export function rankDuelCoffees<T extends CoffeeLike>(catalog:T[],p:DuelProfile,entries:Rating[]=[]):T[]{
 return catalog.filter(c=>!['Accesoriu','Set degustare'].includes(c.kind||'')&&(!c.variants||c.variants.some(v=>v.stock>0))&&(p.caffeine!=='decaf'||c.decaf===true)&&(p.caffeine!=='regular'||!c.decaf)).sort((a,b)=>duelScore(b,p,entries)-duelScore(a,p,entries)||a.name.localeCompare(b.name,'ro'));
}
export function duelReasons(c:CoffeeLike,p:DuelProfile,entries:Rating[]=[]){
 const reasons:string[]=[],notes=noteMatches(c,p);
 if(p.caffeine==='decaf'&&c.decaf)reasons.push('Din gama decofeinizată, conform alegerii tale.');
 if(notes.length)reasons.push('Note din familia aleasă: '+notes.slice(0,2).join(' și ')+'.');
 if(p.method!=='Orice'&&c.methods.includes(p.method))reasons.push('Potrivită pentru '+p.method+'.');
 if(c.acidity===p.acidity)reasons.push('Aciditate '+['','redusă','medie','ridicată'][c.acidity]+', cum ai ales.');
 if(c.body!==undefined&&p.body!==undefined&&c.body===p.body)reasons.push('Corp '+['','lejer','mediu','plin'][c.body]+', apropiat de textura dorită.');
 const saved=entries.filter(e=>e.coffeeId===c.id);if(saved.length)reasons.push('Ținem cont și de evaluările tale din jurnal.');
 if(!reasons.length)reasons.push('O alternativă disponibilă, apropiată de ansamblul preferințelor tale.');
 return reasons.slice(0,3);
}
