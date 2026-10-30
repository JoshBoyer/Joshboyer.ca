'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildContactEmails}=require('../lib/contact-service.cjs');
test('both contact emails use the actual logo/banner, exact tagline and accessible static HTML',()=>{
 const emails=buildContactEmails({name:'<Owner test>',email:'local-test@example.com',message:'<img src=x onerror=alert(1)>',submittedAtIso:'2026-10-30T08:00:00Z'});
 for(const mail of Object.values(emails)){
  assert.match(mail.text,/Grounded in the Metal, Shaped by the Business, Building in the Cloud\./);
  assert.match(mail.html,/https:\/\/joshboyer.ca\/assets\/jb-mark\.png/);assert.match(mail.html,/https:\/\/joshboyer.ca\/assets\/footer-panorama-bg\.jpg/);
  assert.match(mail.html,/role="presentation"/);assert.match(mail.html,/max-width:600px/);assert.match(mail.html,/alt="JB/);
  assert.doesNotMatch(mail.html,/<script|<form|width="1"|height="1"/i);
 }
 assert.doesNotMatch(emails.ownerEmail.html,/<img src=x|<Owner test>/);assert.match(emails.ownerEmail.html,/&lt;Owner test&gt;/);
 assert.doesNotMatch(JSON.stringify(emails.autoReplyEmail),/hello@joshboyer\.ca|onerror|Owner test/);
});
