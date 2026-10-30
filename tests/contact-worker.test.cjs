'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const handlerURL=pathToFileURL(require('node:path').join(__dirname,'../functions/api/contact.js')).href;
test('native Worker contact boundary validates before any send and acknowledges both emails',async()=>{
 const {onRequest}=await import(handlerURL),sent=[];
 const env={CONTACT_MAILER:{async send(mail){sent.push(mail);return {messageId:'LOCAL-TEST-'+sent.length}}}};
 const valid={name:'Local worker test',email:'local-test@example.com',message:'Local only. No real email.'};
 const request=(body,headers={})=>new Request('https://joshboyer.ca/api/contact',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
 for(const [req,status,code] of [
  [request(valid,{Origin:'https://hostile.example'}),403,'ORIGIN_NOT_ALLOWED'],
  [request(valid,{'Content-Type':'text/plain'}),415,'JSON_REQUIRED'],
  [request('{invalid'),400,'INVALID_JSON'],
  [request({...valid,email:'not-an-email'}),400,'EMAIL_INVALID'],
  [request('x'.repeat(25000)),413,'PAYLOAD_TOO_LARGE']
 ]){const r=await onRequest({request:req,env});assert.equal(r.status,status);assert.equal((await r.json()).code,code);}
 assert.equal(sent.length,0);
 const r=await onRequest({request:request(valid,{Origin:'https://joshboyer.ca','CF-Connecting-IP':'127.0.0.2'}),env});
 assert.equal(r.status,200);const body=await r.json();assert.equal(body.code,'CONTACT_ACCEPTED');assert.equal(sent.length,2);
 assert.equal(sent[0].to,'hello@joshboyer.ca');assert.equal(sent[1].to,'local-test@example.com');
 assert.equal(r.headers.get('Cache-Control'),'no-store');assert.doesNotMatch(JSON.stringify(body),/Local only/);
});
