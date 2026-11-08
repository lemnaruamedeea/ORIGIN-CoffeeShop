import {spawn} from 'node:child_process';
const required=['DATABASE_URL','JWT_SECRET','COOKIE_SECRET','ORIGIN_STOREFRONT_URLS'];
const missing=required.filter(k=>!process.env[k]);if(missing.length){console.error('Missing configuration: '+missing.join(', '));process.exit(1);}
let active;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>active?.kill(signal));
async function run(args){await new Promise((resolve,reject)=>{active=spawn(process.execPath,['node_modules/@medusajs/cli/cli.js',...args],{stdio:'inherit',env:process.env});active.on('error',reject);active.on('exit',code=>code===0?resolve():reject(Error('Deployment command failed.')));});}
try{await run(['db:migrate']);await run(['exec','./src/scripts/initialize-hosted.js']);await run(['start','--host','0.0.0.0']);}catch{console.error('Backend startup failed. Check the service logs and configuration.');process.exit(1);}
