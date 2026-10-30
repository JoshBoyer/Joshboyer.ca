'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {buildContactEmails,createContactService}=require('../lib/contact-service.cjs');
const body={name:'Privacy test',email:'local-test@example.com',message:'PRIVATE VISITOR MESSAGE'};
test('visitor receipt has noreply From/Reply-To and no private owner address or original message',()=>{
 const {ownerEmail,autoReplyEmail}=buildContactEmails({...body,submittedAtIso:'2026-10-30T08:00:00Z'});
 assert.equal(ownerEmail.to,'hello@joshboyer.ca');assert.equal(ownerEmail.replyTo,body.email);
 assert.equal(autoReplyEmail.fromAddress,'noreply@joshboyer.ca');assert.equal(autoReplyEmail.replyTo,'noreply@joshboyer.ca');
 assert.doesNotMatch(JSON.stringify(autoReplyEmail),/hello@joshboyer\.ca|PRIVATE VISITOR MESSAGE/);
 assert.match(autoReplyEmail.text,/not monitored/);assert.match(autoReplyEmail.html,/https:\/\/joshboyer.ca\/#home-connect/);
});
test('public contact source, API success and every provider failure hide the owner address',async()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/architect-workbench.js'),'utf8');assert.doesNotMatch(source,/hello@joshboyer\.ca/);
 for(const options of [{env:{}},{sendMailFn:async()=>{throw Error('provider secret')}},{sendMailFn:async()=>({id:'local-test'})}]){
  const r=await createContactService(options).handleSubmission({body,clientIp:'127.0.0.1'});assert.doesNotMatch(JSON.stringify(r),/hello@joshboyer\.ca|provider secret/);
 }
});
