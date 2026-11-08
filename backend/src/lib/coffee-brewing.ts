// Pure shared domain code: used by React and by AI context. No server dependencies.
// House starting recipes, not measured extraction data or manufacturer certifications.
export type BrewSettings={coffeeId:string;dose:number;ratio:number;temperature:number;grind:number};
export type CoffeeDescriptor={id:string;name?:string;roast?:string;process?:string};
export type CoffeeBrewProfile={dose:number;ratio:number;temperature:number;grind:number;seconds:number;preferredMethod:string;reason:string};
export const coffeeBrewProfiles:Record<string,CoffeeBrewProfile>={
 'burundi-kayanza':{dose:18,ratio:16.8,temperature:95,grind:45,seconds:200,preferredMethod:'V60',reason:'Profilul spălat și notele de ceai pornesc de la apă caldă și un raport aerisit, pentru claritate și dulceață.'},
 'honduras-marcala':{dose:20,ratio:15.8,temperature:92,grind:54,seconds:185,preferredMethod:'Espresso',reason:'Procesarea honey favorizează o extracție moderată, care păstrează textura și dulceața de caramel.'},
 'el-salvador-apaneca':{dose:18,ratio:16.2,temperature:93,grind:52,seconds:190,preferredMethod:'V60',reason:'Pacamara natural pornește de la un filtru echilibrat, pentru a pune fructele coapte alături de textura de marțipan.'},
 'mexico-chiapas':{dose:20,ratio:15.2,temperature:90,grind:58,seconds:170,preferredMethod:'Espresso',reason:'O referință mai concentrată și blândă pentru ciocolată, migdale și corp rotund.'},
 'tanzania-kilimanjaro':{dose:20,ratio:16.8,temperature:96,grind:44,seconds:205,preferredMethod:'V60',reason:'Prăjirea light și profilul citric cer o extracție susținută pentru dulceață și un final limpede.'},
 'india-malabar':{dose:18,ratio:14.8,temperature:87,grind:65,seconds:155,preferredMethod:'French Press',reason:'Procesarea monsooned și prăjirea medium-dark pornesc de la apă mai rece, pentru corp și condimente fără exces de amăreală.'},
 'ethiopia-guji':{dose:20,ratio:16.5,temperature:95,grind:46,seconds:195,preferredMethod:'V60',reason:'Prăjirea light cere mai multă energie; raportul mai aerisit pune în valoare notele florale și fructele.'},
 'brazil-santos':{dose:18,ratio:15,temperature:90,grind:59,seconds:165,preferredMethod:'Espresso',reason:'Prăjirea medium și profilul de ciocolată pornesc de la apă mai blândă și o măcinătură mai grosieră, pentru dulceață.'},
 'colombia-huila':{dose:20,ratio:16,temperature:93,grind:51,seconds:185,preferredMethod:'V60',reason:'Procesarea spălată și prăjirea medium-light favorizează o ceașcă clară, cu echilibru între caramel și prospețime.'},
 'kenya-kirinyaga':{dose:20,ratio:17,temperature:96,grind:43,seconds:210,preferredMethod:'V60',reason:'Profilul light, spălat, primește o extracție mai susținută pentru a pune dulceața alături de aciditatea fructată.'},
 'rwanda-nyamasheke':{dose:18,ratio:16.5,temperature:94,grind:48,seconds:190,preferredMethod:'V60',reason:'O referință de filtru delicată, care urmărește claritatea notelor de ceai, mandarină și miere.'},
 'guatemala-antigua':{dose:20,ratio:15.5,temperature:92,grind:55,seconds:180,preferredMethod:'Espresso',reason:'Un raport ușor mai concentrat și o temperatură moderată păstrează corpul și dulceața profilului medium.'},
 'costa-rica-tarrazu':{dose:18,ratio:16,temperature:92,grind:53,seconds:180,preferredMethod:'V60',reason:'Procesarea honey și prăjirea medium-light pornesc de la o extracție moderată, orientată spre dulceață și textură.'},
 'peru-cajamarca':{dose:20,ratio:15.5,temperature:91,grind:57,seconds:175,preferredMethod:'French Press',reason:'Pentru profilul de cacao și nuci alegem un filtru rotund, cu temperatură moderată și măcinătură medie spre grosieră.'},
 'indonesia-sumatra':{dose:20,ratio:15,temperature:88,grind:63,seconds:160,preferredMethod:'French Press',reason:'Prăjirea medium-dark pornește de la apă mai rece și o măcinătură mai grosieră, pentru a tempera notele amare.'},
 'colombia-decaf':{dose:18,ratio:15.5,temperature:89,grind:61,seconds:165,preferredMethod:'Espresso',reason:'Pentru lotul decofeinizat folosim o referință mai blândă, cu temperatură redusă și măcinătură mai grosieră.'},
 'origin-house-blend':{dose:20,ratio:15,temperature:91,grind:56,seconds:175,preferredMethod:'Espresso',reason:'Blendul casei urmărește o ceașcă dulce și consistentă, cu raport concentrat și temperatură moderată.'},
 'panama-boquete':{dose:18,ratio:16,temperature:91,grind:54,seconds:180,preferredMethod:'V60',reason:'Pentru procesarea anaerobă alegem o extracție moderată, care lasă aromele expresive în prim-plan.'},
};
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
export function brewProfile(coffee:CoffeeDescriptor):CoffeeBrewProfile{
 if(Object.prototype.hasOwnProperty.call(coffeeBrewProfiles,coffee.id))return {...coffeeBrewProfiles[coffee.id]};
 const roast=(coffee.roast||'').toLowerCase();
 const base=roast.includes('dark')?coffeeBrewProfiles['indonesia-sumatra']:roast.includes('light')?coffeeBrewProfiles['ethiopia-guji']:coffeeBrewProfiles['brazil-santos'];
 return {...base,reason:'Punct de pornire ales după prăjire. Ajustează după gust și după comportamentul cafelei la preparare.'};
}
export function brewReference(coffee:CoffeeDescriptor,dose?:number){
 const profile=brewProfile(coffee),actualDose=typeof dose==='number'&&Number.isFinite(dose)?clamp(dose,12,30):profile.dose;
 // Larger beds usually require a coarser starting grind; keep ratio and temperature per lot.
 const grind=Math.round(clamp(profile.grind+(actualDose-profile.dose)*.8,0,100));
 return {coffeeId:coffee.id,dose:actualDose,ratio:profile.ratio,temperature:profile.temperature,grind};
}
export function brewTime(coffee:CoffeeDescriptor,dose?:number){const p=brewProfile(coffee);return Math.round(p.seconds+((dose??p.dose)-p.dose)*2);}
export function challengeBrew(coffee:CoffeeDescriptor,dose?:number):BrewSettings{const ref=brewReference(coffee,dose);return {...ref,temperature:Math.max(80,ref.temperature-8),grind:Math.min(100,ref.grind+22)};}
export function evaluateBrew(b:BrewSettings,coffee:CoffeeDescriptor){
 const target=brewReference(coffee,b.dose);
 const deviations=[
  {key:'temperature',label:'Temperatură',delta:(b.temperature-target.temperature)/1.5,actual:b.temperature,target:target.temperature,tolerance:1.5,unit:'°C'},
  {key:'ratio',label:'Raport',delta:(b.ratio-target.ratio)/.4,actual:b.ratio,target:target.ratio,tolerance:.4,unit:''},
  {key:'grind',label:'Măcinătură',delta:(target.grind-b.grind)/4,actual:b.grind,target:target.grind,tolerance:4,unit:'/100'},
 ];
 const parameters=deviations.map(p=>({...p,inRange:Math.abs(p.delta)<=1+1e-6}));
 const balanced=parameters.every(p=>p.inRange),dominant=[...parameters].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0];
 const position=balanced?50:clamp(50+dominant.delta*15,5,95);
 const name=coffee.name||'această cafea';
 const label=dominant.key==='temperature'?'temperatura':dominant.key==='ratio'?'raportul':'măcinătura';
 const adjustment=dominant.key==='temperature'?`Apropie temperatura de ${target.temperature} °C.`:dominant.key==='ratio'?`Apropie raportul de 1:${target.ratio}.`:`Apropie măcinătura de ${target.grind}/100 (${b.grind>target.grind?'mai fină':'mai grosieră'}).`;
 return {position,tone:balanced?'balanced':dominant.delta<0?'under':'over',title:balanced?`În echilibru pentru ${name}`:`Ajustează ${label} pentru ${name}`,text:balanced?'Parametrii sunt în intervalele rețetei acestei cafele. Gustă și ajustează după preferințele tale.':`${adjustment} Referința se adaptează cafelei și dozei; valori foarte diferite nu se anulează între ele.`,parameters,target};
}
