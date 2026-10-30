'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../dist/architect-workbench.js'),'utf8');
const start=code.indexOf('    const CONTACT_AUTOREPLY_ADDRESS'),end=code.indexOf('    document.addEventListener("input"',start);
function setup(response,message='API test only'){
 const node=value=>({value,removeAttribute(){},setAttribute(){},focus(){}});
 const fields={'[data-contact-name]':node('Local contact test'),'[data-contact-reply]':node('local-test@example.com'),'[data-contact-topic-select]':node('Integration'),'[data-contact-message]':node(message),'[data-contact-honeypot]':node(''),'[data-contact-submit]':{disabled:false},'[data-contact-submit-label]':{textContent:'Send Message'}};
 const children={};const feedback={hidden:true,querySelector(key){return children[key]||=(key==='[data-contact-mailto-link]'?{setAttribute(k,v){this[k]=v}}:{})}};fields['[data-contact-feedback]']=feedback;
 let submit,calls=0,resets=0,request;
 const form={getAttribute:()=> 'api',querySelector:key=>fields[key],reset(){resets++}};
 new Function('document','fetch',code.slice(start,end))({addEventListener(type,fn){if(type==='submit')submit=fn}},async(url,options)=>{calls++;request={url,...options};return response});
 return {fields,feedback,children,run:async()=>{await submit({target:{closest:()=>form},preventDefault(){}});return {calls,resets,request}}};
}
test('native form success requires actual CONTACT_ACCEPTED and makes one request',async()=>{
 const f=setup({ok:true,json:async()=>({ok:true,code:'CONTACT_ACCEPTED'})}),r=await f.run();
 assert.equal(r.calls,1);assert.equal(r.resets,1);assert.equal(r.request.url,'/api/contact');
 assert.equal(JSON.parse(r.request.body).message,'[Topic: Integration]\n\nAPI test only');
 assert.match(f.feedback.className,/is-success/);assert.match(f.children['[data-contact-feedback-title]'].textContent,/sent to Josh/);assert.doesNotMatch(f.children['[data-contact-feedback-title]'].textContent,/Local contact test/);assert.match(f.children['[data-contact-feedback-meta]'].textContent,/confirmation email is on its way/);
 assert.equal(f.fields['[data-contact-submit]'].disabled,false);
});
test('unavailable provider preserves message and exposes a direct draft without fake success',async()=>{
 const f=setup({ok:false,status:503,json:async()=>({ok:false,code:'EMAIL_PROVIDER_UNCONFIGURED'})}),r=await f.run();
 assert.equal(r.calls,1);assert.equal(r.resets,0);assert.equal(f.fields['[data-contact-message]'].value,'API test only');
 assert.match(f.children['[data-contact-feedback-title]'].textContent,/has not been sent/);
 assert.doesNotMatch(f.feedback.innerHTML,/mailto:|hello@joshboyer\.ca/);assert.ok(f.children['[data-contact-unsent-copy]'].value.includes('API test only'));
 assert.match(f.feedback.className,/is-error/);
});
test('API mode rejects a message plus topic above the limit without silently truncating',async()=>{
 const f=setup(null,'x'.repeat(5000)),r=await f.run();assert.equal(r.calls,0);assert.equal(r.resets,0);
 assert.equal(f.fields['[data-contact-message]'].value.length,5000);assert.match(f.feedback.textContent,/shorten your message/);
});
