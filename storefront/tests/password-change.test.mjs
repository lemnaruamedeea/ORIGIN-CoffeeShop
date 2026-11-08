import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordChangeFields} from '../../backend/src/lib/registration.ts';
test('new password must match confirmation, differ from old password and have 8–128 characters',()=>{assert.deepEqual(passwordChangeFields({password:'old-value',newPassword:'New-value123!',confirmation:'New-value123!'}),{newPassword:'New-value123!'});for(const b of [{newPassword:'short',confirmation:'short'},{newPassword:'abcdefgh',confirmation:'different'},{password:'abcdefgh',newPassword:'abcdefgh',confirmation:'abcdefgh'},{newPassword:'x'.repeat(129),confirmation:'x'.repeat(129)},{newPassword:null,confirmation:null}])assert.throws(()=>passwordChangeFields(b));});
test('password characters and meaningful whitespace are not silently altered',()=>{const p='  Parolă-nouă!  ';assert.equal(passwordChangeFields({password:'old',newPassword:p,confirmation:p}).newPassword,p);});
