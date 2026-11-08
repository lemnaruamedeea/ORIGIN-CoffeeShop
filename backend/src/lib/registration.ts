// Shared validation and message content; no credentials or infrastructure imports.
export function registrationDetails(body:any){
 const name=(value:any,label:string)=>{const s=typeof value==='string'?value.trim().replace(/\s+/g,' '):'';if(!s||s.length>80||/[\u0000-\u001f\u007f]/.test(s))throw Error(`Introdu ${label}, de maximum 80 de caractere.`);return s;};
 const firstName=name(body?.firstName,'prenumele'),lastName=name(body?.lastName,'numele');
 const raw=typeof body?.phone==='string'?body.phone.trim():'';
 const phone=raw.replace(/[\s().-]/g,'');
 if(!/^[+\d\s().-]+$/.test(raw)||!/^\+?\d{9,15}$/.test(phone))throw Error('Introdu un număr de telefon valid, cu 9–15 cifre.');
 return {firstName,lastName,phone};
}
export function welcomeMessage(customer:{first_name?:string|null},url:string){
 return {subject:'Bun venit la ORIGIN — contul tău a fost creat',text:[`Bun venit, ${customer.first_name||'exploratorule'}!`,'','Contul tău ORIGIN Coffee a fost creat cu succes.','De acum poți păstra degustările în jurnalul personal, îți poți descoperi profilul de gust în Coffee Duel și poți urmări comenzile din cont.','',url.replace(/\/$/,'')+'/#shop','','Te așteptăm la o nouă descoperire.','Echipa ORIGIN Coffee','','Acest mesaj confirmă crearea contului. Nu include parola și nu îți vom cere parola prin e-mail.','Dacă nu ai creat acest cont, contactează-ne răspunzând la acest mesaj.'].join('\n')};
}
export async function sendWelcomeEmail(customer:{email:string;first_name?:string|null},send:(message:any)=>Promise<any>,from:string,url:string){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)||/\.(local|test|invalid|example)$/i.test(customer.email))throw Error('Recipient not deliverable');
 const result=await send({from:{name:'ORIGIN Coffee',address:from},to:customer.email,...welcomeMessage(customer,url),disableFileAccess:true,disableUrlAccess:true});
 if(!result.accepted?.some((email:any)=>String(email).toLowerCase()===customer.email.toLowerCase()))throw Error('Mail not accepted');
}

export function passwordChangeFields(body:any){
 const password=typeof body?.password==='string'?body.password:'';
 const newPassword=typeof body?.newPassword==='string'?body.newPassword:'';
 const confirmation=typeof body?.confirmation==='string'?body.confirmation:'';
 if(newPassword.length<8||newPassword.length>128)throw Error('Parola nouă trebuie să aibă între 8 și 128 de caractere.');
 if(newPassword!==confirmation)throw Error('Confirmarea parolei noi nu coincide.');
 if(newPassword===password)throw Error('Alege o parolă diferită de cea curentă.');
 return {newPassword};
}
