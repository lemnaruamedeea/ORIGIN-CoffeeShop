const json=(status,message)=>({statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({error:'backend_unavailable',message})});
export async function handler(event){
 const base=process.env.ORIGIN_BACKEND_URL;if(!base)return json(503,'Magazinul online este în curs de configurare. Revino în curând.');
 let url;try{url=new URL(base);if(url.protocol!=='https:')throw Error();}catch{return json(503,'Conexiunea magazinului nu este configurată.');}
 const raw=event.path.replace(/^\/(?:api|\.netlify\/functions\/api-proxy)\/?/,'');
 if(!/^[a-zA-Z0-9_/-]*$/.test(raw)||raw.includes('..'))return json(400,'Adresă invalidă.');
 url.pathname='/origin/'+raw;url.search=event.rawQuery||new URL(event.rawUrl||'https://example.test').search;
 const headers={};for(const key of ['content-type','origin','sec-fetch-site','accept'])if(event.headers?.[key])headers[key]=event.headers[key];
 headers['accept-encoding']='identity';if(event.headers?.cookie)headers.cookie=event.headers.cookie.split(';').filter(s=>/^\s*origin_(auth|session|checkout_guest)=/.test(s)).join(';');
 try{const response=await fetch(url,{method:event.httpMethod,headers,...(!['GET','HEAD'].includes(event.httpMethod)?{body:event.isBase64Encoded?Buffer.from(event.body||'','base64'):event.body||''}:{}),redirect:'manual',signal:AbortSignal.timeout(55000)});
 const out={'Cache-Control':'no-store'};for(const key of ['content-type','location'])if(response.headers.get(key))out[key]=response.headers.get(key);
 return {statusCode:response.status,headers:out,multiValueHeaders:{'Set-Cookie':response.headers.getSetCookie()},isBase64Encoded:true,body:Buffer.from(await response.arrayBuffer()).toString('base64')};
 }catch{return json(503,'Magazinul pornește sau este temporar indisponibil. Reîncearcă în aproximativ un minut.');}
}
