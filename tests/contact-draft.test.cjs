'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/architect-workbench.js'),'utf8');
const start=source.indexOf('    const CONTACT_AUTOREPLY_ADDRESS');
const end=source.indexOf('    document.addEventListener("input"',start);
assert.ok(start>0&&end>start,'Actual contact handler must be found');
function fixture(overrides={}){
 const controls={};
 const input=value=>({value,attrs:{},removeAttribute(k){delete this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true}});
 for(const [key,value] of Object.entries({name:'Contact test',reply:'local-test@example.com','topic-select':'Architecture & Automation',message:'Hello <img src=x onerror=alert(1)>\nSecond line',honeypot:'',...overrides}))controls['[data-contact-'+key+']']=input(value);
 const link={attrs:{},setAttribute(k,v){this.attrs[k]=v}},copy={value:''},title={textContent:''};
 const feedback={hidden:true,innerHTML:'',textContent:'',querySelector(s){return s==='[data-contact-mailto-link]'?link:s==='[data-contact-unsent-copy]'?copy:s==='[data-contact-feedback-title]'?title:null}};
 controls['[data-contact-feedback]']=feedback;
 controls['[data-contact-submit]']={disabled:false};
 controls['[data-contact-submit-label]']={textContent:'Prepare email draft'};
 let reset=0,fetches=0,submit;
 const form={getAttribute(k){return k==='data-contact-delivery'?'draft-only':null},querySelector(s){return controls[s]||null},reset(){reset++}};
 const doc={addEventListener(type,fn){if(type==='submit')submit=fn}};
 new Function('document','fetch',source.slice(start,end))(doc,()=>{fetches++;throw Error('No request allowed')});
 return {controls,feedback,link,copy,title,form,run:async()=>{let prevented=false;await submit({target:{closest:()=>form},preventDefault(){prevented=true}});return {prevented,reset,fetches}}};
}
test('draft-only contact preserves all entered text and never submits or reports sent',async()=>{
 const f=fixture();const before=Object.fromEntries(Object.entries(f.controls).filter(([,v])=>'value'in v).map(([k,v])=>[k,v.value]));
 assert.deepEqual(await f.run(),{prevented:true,reset:0,fetches:0});
 for(const [k,v] of Object.entries(before))assert.equal(f.controls[k].value,v);
 assert.equal(f.feedback.hidden,false);assert.match(f.title.textContent,/Your message has not been sent/);
 assert.doesNotMatch(f.feedback.innerHTML,/<img|onerror/);
 assert.match(f.copy.value,/\[Topic: Architecture & Automation\]/);
 assert.match(f.copy.value,/<img src=x onerror=alert\(1\)>/);
 assert.doesNotMatch(f.feedback.innerHTML,/mailto:|hello@joshboyer\.ca/);
 assert.equal(f.controls['[data-contact-submit]'].disabled,false);
});
test('invalid email stays local and focuses the invalid field',async()=>{
 const f=fixture({reply:'bad-email'});assert.deepEqual(await f.run(),{prevented:true,reset:0,fetches:0});
 assert.match(f.feedback.textContent,/valid email address/);assert.equal(f.controls['[data-contact-reply]'].focused,true);
});
test('long valid draft retains the complete message including topic',async()=>{
 const text='Z'.repeat(5000),f=fixture({message:text});await f.run();
 assert.ok(f.copy.value.includes(text),'A valid maximum-length message must not be silently truncated');
});
