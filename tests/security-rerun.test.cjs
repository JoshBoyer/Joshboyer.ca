'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url'),{EventEmitter}=require('node:events');
const root=path.resolve(__dirname,'..');
function worker(){
 let dispatches=0;
 const source=fs.readFileSync(path.join(root,'worker.mjs'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{PortfolioState\}.*;\r?\n/gm,'').replace('export default','globalThis.handler=');
 const context={URL,Request,Response,Headers,files:JSON.parse(fs.readFileSync(path.join(root,'public-manifest.json'))),previous:{fetch(){dispatches++;return new Response('legacy');}},contact(){dispatches++;return new Response('contact');},byteRange(){return null;},mediaSlice(){}};
 vm.createContext(context);vm.runInContext(source,context);
 const env={ASSETS:{fetch(){dispatches++;return new Response('<!doctype html><title>Mock portfolio</title>',{headers:{'Content-Type':'text/html; charset=utf-8'}});}}},ctx={waitUntil(){},passThroughOnException(){}};
 return{request:url=>context.handler.fetch(new Request(url),env,ctx),post:url=>context.handler.fetch(new Request(url,{method:'POST',body:'do not parse'}),env,ctx),dispatches:()=>dispatches};
}
test('HTTP public traffic redirects without dispatch; insecure contact is rejected without parsing',async()=>{
 const w=worker();for(const host of ['joshboyer.ca','www.joshboyer.ca']){
  const r=await w.request('http://'+host+'/about?view=detail');assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'https://'+host+'/about?view=detail');assert.equal(r.headers.get('Strict-Transport-Security'),null);
  const c=await w.post('http://'+host+'/api/contact');assert.equal(c.status,403);assert.equal((await c.json()).code,'HTTPS_REQUIRED');
 }assert.equal(w.dispatches(),0);
 const {onRequest}=await import(pathToFileURL(path.join(root,'functions/api/contact.js')).href);
 const request={url:'http://joshboyer.ca/api/contact',method:'POST',headers:new Headers(),get body(){throw new Error('Insecure body was accessed');}};
 const response=await onRequest({request,env:{get CONTACT_MAILER(){throw new Error('Insecure transport was accessed');}}});assert.equal(response.status,403);
});
test('HSTS is HTTPS host-only and HTML CSP allows required local assets and analytics without unsafe script execution',async()=>{
 const w=worker(),r=await w.request('https://joshboyer.ca/');assert.equal(r.status,200);assert.equal(r.headers.get('Strict-Transport-Security'),'max-age=86400');
 const policy=r.headers.get('Content-Security-Policy');assert.ok(policy);assert.match(policy,/script-src 'self' https:\/\/static\.cloudflareinsights\.com/);assert.match(policy,/connect-src 'self' https:\/\/cloudflareinsights\.com/);assert.match(policy,/object-src 'none'/);assert.match(policy,/frame-ancestors 'none'/);assert.doesNotMatch(policy,/unsafe-eval|script-src[^;]*unsafe-inline|includeSubDomains|preload/);
 const local=await w.request('http://127.0.0.1:4197/');assert.equal(local.status,200);assert.equal(local.headers.get('Strict-Transport-Security'),null);
 const retired=await w.request('https://joshboyer.ca/api/twin/chat');assert.equal(retired.status,410);assert.equal(retired.headers.get('Strict-Transport-Security'),'max-age=86400');
});
test('skills no-results rendering keeps hostile search markup literal',()=>{
 const source=fs.readFileSync(path.join(root,'dist/architect-workbench.js'),'utf8'),a=source.indexOf('    function renderSkillsMainContainerHtml()'),b=source.indexOf('    // Reusable Component 5:',a);assert(a>0&&b>a);
 for(const input of ['<img src=x onerror="alert(1)">', '<script>alert(1)</script> & "\'']){
  const context={activeSkillViewMode:'cards',activeSkillFilter:'all',activeSkillSearch:input,getFilteredSkillCategories:()=>[]};
  const html=vm.runInNewContext(source.slice(a,b)+'\nrenderSkillsMainContainerHtml()',context);
  assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;/);assert.match(html,/&gt;/);assert.match(html,/&quot;/);
 }
});
test('streamed contact bodies have a total read deadline and cancel before sending',async t=>{
 const {onRequest}=await import(pathToFileURL(path.join(root,'functions/api/contact.js')).href),{CONTACT_LIMITS}=require(path.join(root,'lib/contact-service.cjs'));
 let cancelled=0,sends=0;const body=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled++;}});
 const request=new Request('https://joshboyer.ca/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body,duplex:'half'});
 t.mock.timers.enable({apis:['setTimeout']});
 const pending=onRequest({request,env:{CONTACT_MAILER:{async send(){sends++;return{messageId:'must-not-send'};}}}});
 t.mock.timers.tick(CONTACT_LIMITS.requestReadTimeoutMs+1);const response=await pending;
 assert.equal(response.status,408);assert.equal((await response.json()).code,'REQUEST_TIMEOUT');assert.equal(sends,0);assert.equal(cancelled,1);
});
test('local contact reader bounds total time and pauses an unfinished upload',async()=>{
 const source=fs.readFileSync(path.join(root,'serve.cjs'),'utf8'),a=source.indexOf('function readRawBody('),b=source.indexOf('\nfunction sendJson(',a);let deadline;
 const {CONTACT_LIMITS}=require(path.join(root,'lib/contact-service.cjs'));
 const context={Buffer,CONTACT_LIMITS,setTimeout(fn,ms){assert.equal(ms,CONTACT_LIMITS.requestReadTimeoutMs);deadline=fn;return 1;},clearTimeout(){}};
 vm.createContext(context);vm.runInContext(source.slice(a,b),context);const req=new EventEmitter();let paused=false;req.pause=()=>{paused=true;};
 const pending=context.readRawBody(req,CONTACT_LIMITS.maxRequestBodyBytes);const rejected=assert.rejects(pending,e=>e.statusCode===408);deadline();await rejected;assert.equal(paused,true);
});
