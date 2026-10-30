'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createContactService}=require('../lib/contact-service.cjs');
const payload={name:'Contact delivery test',email:'local-test@example.com',message:'TEST-ONLY-PRIVATE-BODY <script>test</script>'};
test('native binding receives owner notification and separate safe visitor receipt',async()=>{
 const calls=[];const service=createContactService({env:{CONTACT_MAILER:{async send(mail){calls.push(mail);return {messageId:'test-local-'+calls.length}}}}});
 const r=await service.handleSubmission({body:payload,clientIp:'127.0.0.1'});
 assert.equal(r.status,200);assert.equal(r.body.code,'CONTACT_ACCEPTED');assert.equal(calls.length,2);
 const [owner,receipt]=calls;
 assert.deepEqual(owner.from,{email:'noreply@joshboyer.ca',name:'Josh Boyer'});
 assert.equal(owner.to,'hello@joshboyer.ca');assert.equal(owner.replyTo,payload.email);
 assert.ok(owner.text.includes(payload.message));assert.doesNotMatch(owner.html,/<script>/);
 assert.equal(receipt.to,payload.email);assert.equal(receipt.from.email,'noreply@joshboyer.ca');assert.equal(receipt.replyTo,'noreply@joshboyer.ca');
 assert.doesNotMatch(JSON.stringify(receipt),/hello@joshboyer\.ca/);assert.doesNotMatch(JSON.stringify(r.body),/hello@joshboyer\.ca/);
 assert.doesNotMatch(receipt.text,/TEST-ONLY-PRIVATE-BODY/);assert.doesNotMatch(receipt.html,/TEST-ONLY-PRIVATE-BODY/);
 assert.equal(owner.cc,undefined);assert.equal(owner.bcc,undefined);
});
test('native rejection reports actual partial state without retry or leaking provider error',async()=>{
 let sends=0;const service=createContactService({env:{CONTACT_MAILER:{async send(){sends++;if(sends===2)throw Error('SECRET-ERROR');return {messageId:'local-owner'}}}}});
 const r=await service.handleSubmission({body:payload,clientIp:'127.0.0.1'});
 assert.equal(sends,2);assert.equal(r.status,502);assert.equal(r.body.code,'CONTACT_AUTOREPLY_FAILED');assert.equal(r.body.ownerDeliveryStatus,'accepted_by_provider');
 assert.doesNotMatch(JSON.stringify(r),/SECRET-ERROR/);
});
test('a missing provider acknowledgement never becomes a success or triggers confirmation',async()=>{
 let sends=0;const service=createContactService({env:{CONTACT_MAILER:{async send(){sends++;return undefined}}}});
 const r=await service.handleSubmission({body:payload,clientIp:'127.0.0.1'});
 assert.equal(sends,1);assert.equal(r.status,502);assert.equal(r.body.code,'CONTACT_DELIVERY_FAILED');
});
test('native transport still enforces validation and honeypot before sending',async()=>{
 let sends=0;const service=createContactService({env:{CONTACT_MAILER:{async send(){sends++;return {messageId:'local'}}}}});
 for(const body of [{...payload,email:'bad-email'},{...payload,website:'bot'},{...payload,message:'x'.repeat(5001)}]){
  const r=await service.handleSubmission({body,clientIp:'127.0.0.1'});assert.equal(r.status,400);
 }
 assert.equal(sends,0);
});
