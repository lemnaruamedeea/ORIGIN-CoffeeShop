import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationDetails,welcomeMessage,sendWelcomeEmail} from '../../backend/src/lib/registration.ts';
test('registration requires both names and phone, supports Romanian names and international numbers',()=>{
 assert.deepEqual(registrationDetails({firstName:'  Ana Maria ',lastName:'Ștefan-Popescu',phone:'+40 (712) 345-678'}),{firstName:'Ana Maria',lastName:'Ștefan-Popescu',phone:'+40712345678'});
 for(const patch of [{firstName:''},{lastName:''},{phone:''},{phone:'123'},{phone:'07abc123456'},{phone:'1'.repeat(16)},{lastName:'a'.repeat(81)}])assert.throws(()=>registrationDetails({firstName:'Ana',lastName:'Popescu',phone:'0712345678',...patch}));
});
test('welcome notification confirms creation without passwords or activation claims',()=>{
 const message=welcomeMessage({first_name:'Ana'},'https://origin.example/');
 assert.match(message.subject,/contul tău a fost creat/);assert.match(message.text,/Bun venit, Ana/);assert.match(message.text,/https:\/\/origin.example\/#shop/);assert.doesNotMatch(message.text,/activează|token=|password=/i);
});
test('welcome goes only to customer address, uses configured sender and requires SMTP acceptance',async()=>{
 let sent;
 await sendWelcomeEmail({email:'customer@example.com',first_name:'Ana'},async m=>{sent=m;return {accepted:['customer@example.com']};},'sender@example.com','https://origin.example');
 assert.equal(sent.to,'customer@example.com');assert.equal(sent.from.address,'sender@example.com');assert.equal(sent.disableFileAccess,true);assert.equal(sent.disableUrlAccess,true);
 await assert.rejects(sendWelcomeEmail({email:'customer@example.com'},async()=>({accepted:[]}),'sender@example.com','https://origin.example'));
 await assert.rejects(sendWelcomeEmail({email:'customer@example.com'},async()=>{throw Error('SMTP unavailable');},'sender@example.com','https://origin.example'));
});
test('reserved test recipients cannot generate external email',async()=>{
 for(const email of ['qa@example.test','qa@cafea.local','bad\nmail@example.com'])await assert.rejects(sendWelcomeEmail({email},async()=>{assert.fail('must not send');},'sender@example.com','https://origin.example'));
});
