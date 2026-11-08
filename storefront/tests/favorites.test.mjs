import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanFavorites,mergeFavorites,toggleFavorite} from '../../backend/src/lib/origin-favorites.ts';
import {cleanExperience} from '../../backend/src/lib/origin-ai.ts';
test('favorites sanitize IDs, deduplicate, bound count and migrate old experience',()=>{for(const value of [undefined,null,{},[],['ethiopia-guji','ethiopia-guji','rasnita-manuala-atlas',null,'<script>','../private','A'.repeat(101)],Array.from({length:110},(_,i)=>'product-'+i)])assert.deepEqual(cleanExperience({favorites:value}).favorites,cleanFavorites(value));assert.equal(cleanFavorites(Array.from({length:110},(_,i)=>'p-'+i)).length,100);assert.deepEqual(cleanExperience({profile:null,entries:[],badges:[]}).favorites,[]);});
test('toggle adds and removes a coffee or accessory without mutating input',()=>{const ids=['ethiopia-guji'];assert.deepEqual(toggleFavorite(ids,'rasnita-manuala-atlas'),['rasnita-manuala-atlas','ethiopia-guji']);assert.deepEqual(toggleFavorite(ids,'ethiopia-guji'),[]);assert.deepEqual(ids,['ethiopia-guji']);});
test('guest favorites merge into existing account without duplicate or lost saved products',()=>{assert.deepEqual(mergeFavorites(['ethiopia-guji','colombia-huila'],['ethiopia-guji','french-press-600']),['ethiopia-guji','colombia-huila','french-press-600']);});
