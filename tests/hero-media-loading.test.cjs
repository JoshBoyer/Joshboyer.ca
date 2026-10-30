'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const media=require('../dist/hero-media-loading.js');
function target(fields={}){const listeners=new Map();return Object.assign(fields,{addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);},fire(name){for(const fn of [...(listeners.get(name)||[])])fn();}});}
function fixture({connection={},reduced=false,complete=false,visible=true,home=true}={}){
 const attrs=new Map([['data-story-src','story.mp4']]);let loads=0,plays=0,id=0;const pending=new Map();
 const video={getAttribute:key=>attrs.get(key)||null,setAttribute:(key,value)=>attrs.set(key,value),load(){loads++;},play(){plays++;}};
 const image=target({complete:true,naturalWidth:1200,decode:async()=>{}});
 const doc=target({readyState:complete?'complete':'loading',visibilityState:visible?'visible':'hidden'});
 const motion=target({matches:reduced});const conn=target(connection);
 const win=target({navigator:{connection:conn},matchMedia:()=>motion,requestIdleCallback:fn=>{pending.set(++id,fn);return id;},cancelIdleCallback:token=>pending.delete(token),setTimeout:fn=>{pending.set(++id,fn);return id;},clearTimeout:token=>pending.delete(token)});
 let atHome=home;
 const controller=media.create({video,image,window:win,document:doc,isHome:()=>atHome});
 return{video,image,doc,win,motion,conn,controller,attrs,pending,loads:()=>loads,plays:()=>plays,setHome:value=>{atHome=value;},runIdle:()=>{for(const [token,fn]of [...pending]){pending.delete(token);fn();}}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('hero waits for page and poster readiness, then warms during idle without playing',async()=>{
 const f=fixture();assert.equal(f.loads(),0);assert.equal(f.attrs.has('src'),false);f.win.fire('load');await tick();assert.equal(f.loads(),0);assert.equal(f.pending.size,1);f.runIdle();assert.equal(f.loads(),1);assert.equal(f.attrs.get('src'),'story.mp4');assert.equal(f.video.preload,'metadata');assert.equal(f.plays(),0);f.controller.request();assert.equal(f.video.preload,'auto');
});
test('save-data, slow connections and reduced motion suppress background video but allow explicit watch',async()=>{
 for(const options of [{connection:{saveData:true}},{connection:{effectiveType:'2g'}},{connection:{effectiveType:'3g'}},{connection:{downlink:1}},{reduced:true}]){
  const f=fixture({...options,complete:true});await tick();assert.equal(f.pending.size,0);assert.equal(f.loads(),0);f.controller.request();assert.equal(f.loads(),1);assert.equal(f.plays(),0);
 }
});
test('early watch cancels deferred work and preserves a source selected by the current viewport',async()=>{
 const f=fixture();f.video.setAttribute('data-story-src','portrait.mp4');f.controller.request();assert.equal(f.attrs.get('src'),'portrait.mp4');assert.equal(f.loads(),1);f.win.fire('load');await tick();f.runIdle();assert.equal(f.loads(),1);assert.equal(f.pending.size,0);
});
test('hidden pages and other routes do not warm; leaving cancels queued work',async()=>{
 const f=fixture({complete:true,visible:false,home:false});await tick();assert.equal(f.pending.size,0);f.doc.visibilityState='visible';f.setHome(true);f.win.fire('hashchange');assert.equal(f.pending.size,1);f.win.fire('pagehide');assert.equal(f.pending.size,0);f.runIdle();assert.equal(f.loads(),0);
});
test('a slow or failed poster keeps the background video out of the critical path',async()=>{
 const f=fixture();f.image.complete=false;f.win.fire('load');await tick();assert.equal(f.pending.size,0);f.image.complete=true;f.image.fire('load');await tick();assert.equal(f.pending.size,1);
 const bad=fixture();bad.image.naturalWidth=0;bad.win.fire('load');await tick();assert.equal(bad.pending.size,0);assert.equal(bad.loads(),0);
});

test('the loading splash defers hero warming and dismissal reschedules it',async()=>{
 const f=fixture({complete:true});let introOpen=true;
 f.doc.querySelector=()=>introOpen?{}:null;
 await tick();assert.equal(f.pending.size,0);assert.equal(f.loads(),0);
 introOpen=false;f.doc.fire('portfolio:intro-dismissed');assert.equal(f.pending.size,1);
 f.runIdle();assert.equal(f.loads(),1);assert.equal(f.plays(),0);
 f.controller.dispose();f.doc.fire('portfolio:intro-dismissed');assert.equal(f.pending.size,0);
});
