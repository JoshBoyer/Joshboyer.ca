/* Subtle living-scene player for JoshBoyer.ca career milestone photographs. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.LivingScenes=api;api.mount();}})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FPS=20,CYCLE_MS=10000,ACTIVE_MS=9000, IMAGE_SRC='assets/optimized/career-milestones-context-1024.webp';
const SCENES=Object.freeze([
  {id:'support',y:0,height:300,desktop:{x:126,width:810},mobile:{x:170,width:600},quad:[[214,20],[492,20],[492,214],[214,214]],secondQuad:[[576,10],[725,18],[725,226],[576,205]],phases:[{name:'intake',end:2200,label:'Fault intake'},{name:'narrow',end:5600,label:'Isolate subsystem'},{name:'verify',end:9000,label:'Verify hardware path'}]},
  {id:'systems',y:300,height:268,desktop:{x:300,width:724},mobile:{x:488,width:536},quad:[[205,6],[585,6],[585,238],[205,238]],secondQuad:[[685,16],[968,16],[968,242],[685,242]],phases:[{name:'coupled',end:2200,label:'Shared services'},{name:'stage',end:5600,label:'Staged migration'},{name:'separated',end:9000,label:'Separated roles'}]},
  {id:'infrastructure',y:568,height:291,desktop:{x:120,width:786},mobile:{x:275,width:582},quad:[[95,105],[725,105],[725,286],[95,286]],secondQuad:[[405,14],[910,14],[910,216],[405,216]],phases:[{name:'network',end:2800,label:'Network path'},{name:'services',end:6000,label:'AV, security and cooling'},{name:'power',end:9000,label:'Resilient power and ESXi'}]},
  {id:'analysis',y:859,height:297,desktop:{x:110,width:802},mobile:{x:213,width:594},quad:[[40,14],[656,14],[656,230],[40,230]],secondQuad:[[674,140],[1005,140],[1005,290],[674,290]],phases:[{name:'request',end:2500,label:'Broker payload'},{name:'eligible',end:6000,label:'Standard path'},{name:'refer',end:9000,label:'Human review exception'}]},
  {id:'solutions',y:1156,height:380,desktop:{x:0,width:1024},mobile:{x:130,width:760},quad:[[182,16],[534,18],[534,288],[182,288]],secondQuad:[[550,16],[995,16],[995,372],[550,372]],phases:[{name:'sql',end:2800,label:'Query and balance'},{name:'mapping',end:6200,label:'Schema mapping'},{name:'continuity',end:9000,label:'Validated target load'}]}
]);

const PLAN_PATHS=Object.freeze({
  network:[[278,204],[312,174],[377,186],[396,146],[412,130],[548,68]],
  services:[[312,174],[377,186],[496,187],[453,255]],
  security:[[576,149],[541,191],[585,196],[549,258]],
  power:[[496,187],[541,191],[585,196],[833,78],[833,66]]
});

const NATIVE_PATHS=Object.freeze({
  support:{
    tree:[[228,113],[288,109],[307,68],[312,108],[316,152]],
    detail:[[318,190],[370,185],[422,181]],
    chassis:[[661,68],[678,92],[668,134],[668,184]]
  },
  systems:{
    trunk:[[825,38],[825,56],[825,91]],
    ad:[[854,91],[906,91],[906,126],[906,150],[906,188],[906,204],[906,220]],
    mail:[[795,91],[743,91],[743,136],[743,148],[743,185],[743,200],[743,216]],
    firewall:[[825,100],[825,183],[796,183],[853,183]],
    rack:[[290,26],[455,26],[440,86],[465,142],[465,194]]
  },
  infrastructure:PLAN_PATHS,
  analysis:{
    form:[[168,189],[208,177],[248,165]],
    request:[[430,48],[489,48],[529,48],[529,90]],
    eligible:[[457,90],[529,90],[568,90]],
    refer:[[529,90],[529,111],[487,111],[487,136],[563,138],[429,159]],
    notebook:[[848,184],[840,212],[832,241]]
  },
  solutions:{
    sql:[[225,53],[225,148],[225,245],[340,245]],
    bars:[[382,54],[435,99],[418,144],[445,228]],
    mapping:[[611,85],[650,82],[650,56],[689,56],[682,169]],
    continuity:[[603,174],[682,169],[736,145],[785,101],[796,200]],
    notes:[[795,305],[875,320],[945,334]]
  }
});

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x);};
function getSpec(id){const s=SCENES.find(v=>v.id===id);if(!s)throw new Error('Unknown living scene: '+id);return s;}
function frameAt(id,ms=0){
  const spec=getSpec(id),t=((ms%CYCLE_MS)+CYCLE_MS)%CYCLE_MS;
  if(t>=ACTIVE_MS){const r=smooth((t-ACTIVE_MS)/(CYCLE_MS-ACTIVE_MS));return{id,loopMs:t,phase:'reset',stage:'reset',label:' Seamless reset',progress:1-r,phaseProgress:r,reset:r,alpha:1-r};}
  let start=0,phase=spec.phases[0];
  for(const p of spec.phases){if(t<p.end){phase=p;break;}start=p.end;}
  const phaseProgress=smooth((t-start)/Math.max(1,phase.end-start));
  return{id,loopMs:t,phase:phase.name,stage:phase.name,label:phase.label,progress:clamp(t/ACTIVE_MS),phaseProgress,reset:0,alpha:1};
}
function allowed(s){
  if(!s||!s.loaded||s.hidden||s.homeHidden||!s.visible||s.paused||s.compare||s.autoPaused)return false;
  if(s.manual)return true;
  return !(s.reduced||s.mobile||s.saveData);
}
function chooseActive(items,viewCenter=0){
  const ok=(items||[]).filter(allowed);if(!ok.length)return null;
  const manual=ok.find(v=>v.manual);if(manual)return manual;
  return ok.slice().sort((a,b)=>Math.abs((a.center||0)-viewCenter)-Math.abs((b.center||0)-viewCenter))[0];
}
function pointOnPath(points,u){
  if(!points||!points.length)return[0,0];if(points.length===1)return points[0];
  const seg=[];let total=0;
  for(let i=0;i<points.length-1;i++){const len=Math.hypot(points[i+1][0]-points[i][0],points[i+1][1]-points[i][1]);seg.push(len);total+=len;}
  let target=clamp(u)*total;
  for(let i=0;i<seg.length;i++){if(target<=seg[i]){const p=seg[i]?target/seg[i]:0;return[points[i][0]+(points[i+1][0]-points[i][0])*p,points[i][1]+(points[i+1][1]-points[i][1])*p];}target-=seg[i];}
  return points[points.length-1];
}
function strokePartial(ctx,points,u,color,width,alpha=1){
  if(alpha<=.01||u<=.001||points.length<2)return;
  ctx.save();
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=color;ctx.lineWidth=width+3.5;ctx.globalAlpha=alpha*0.24;
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  let remain=clamp(u),seg=[],total=0;
  for(let i=0;i<points.length-1;i++){const len=Math.hypot(points[i+1][0]-points[i][0],points[i+1][1]-points[i][1]);seg.push(len);total+=len;}
  let dist=remain*total;
  for(let i=0;i<seg.length;i++){
    if(dist>=seg[i]){ctx.lineTo(points[i+1][0],points[i+1][1]);dist-=seg[i];}
    else{const p=seg[i]?dist/seg[i]:0;ctx.lineTo(points[i][0]+(points[i+1][0]-points[i][0])*p,points[i][1]+(points[i+1][1]-points[i][1])*p);break;}
  }
  ctx.stroke();
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;
  ctx.stroke();
  const[px,py]=pointOnPath(points,u);
  ctx.fillStyle='#ffffff';ctx.globalAlpha=alpha;
  ctx.beginPath();ctx.arc(px,py,Math.max(2.6,width*1.15),0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.stroke();
  ctx.restore();
}
function pulseRing(ctx,x,y,r,a,c='#0755ff',tiltDeg=0,scaleY=1){
  if(a<=.01)return;
  ctx.save();
  ctx.translate(x,y);
  if(tiltDeg)ctx.rotate(tiltDeg*Math.PI/180);
  if(scaleY!==1)ctx.scale(1,scaleY);
  ctx.globalAlpha=a*0.32;ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,r*1.5,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=a*0.85;ctx.strokeStyle=c;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=a;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,Math.max(2.2,r*.38),0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
}
/* Perspective-aligned box that rotates and shears to match non-level screens, bays, forms, and floorplans */
function highlightBox(ctx,x,y,w,h,a,c='#0755ff',tiltDeg=0,skewXDeg=0){
  if(a<=.01)return;
  ctx.save();
  ctx.translate(x,y);
  if(tiltDeg)ctx.rotate(tiltDeg*Math.PI/180);
  if(skewXDeg)ctx.transform(1,0,Math.tan(skewXDeg*Math.PI/180),1,0,0);
  ctx.globalAlpha=a*.18;ctx.fillStyle=c;ctx.fillRect(-w/2,-h/2,w,h);
  ctx.globalAlpha=a*.92;ctx.strokeStyle=c;ctx.lineWidth=1.7;ctx.strokeRect(-w/2,-h/2,w,h);
  const cl=Math.min(5,w*0.25,h*0.35);
  ctx.strokeStyle='#ffffff';ctx.lineWidth=1.4;ctx.globalAlpha=a*.9;
  ctx.beginPath();
  ctx.moveTo(-w/2,-h/2+cl);ctx.lineTo(-w/2,-h/2);ctx.lineTo(-w/2+cl,-h/2);
  ctx.moveTo(w/2-cl,-h/2);ctx.lineTo(w/2,-h/2);ctx.lineTo(w/2,-h/2+cl);
  ctx.moveTo(w/2,h/2-cl);ctx.lineTo(w/2,h/2);ctx.lineTo(w/2-cl,h/2);
  ctx.moveTo(-w/2+cl,h/2);ctx.lineTo(-w/2,h/2);ctx.lineTo(-w/2,h/2-cl);
  ctx.stroke();
  ctx.restore();
}
function highlightDiamond(ctx,x,y,r,a,c='#0755ff',tiltDeg=0,scaleY=1){
  if(a<=.01)return;
  ctx.save();
  ctx.translate(x,y);
  if(tiltDeg)ctx.rotate(tiltDeg*Math.PI/180);
  if(scaleY!==1)ctx.scale(1,scaleY);
  ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,r);ctx.lineTo(-r,0);ctx.closePath();
  ctx.globalAlpha=a*.22;ctx.fillStyle=c;ctx.fill();
  ctx.globalAlpha=a*.92;ctx.strokeStyle=c;ctx.lineWidth=1.8;ctx.stroke();
  ctx.restore();
}
function lamps(ctx,f){
  const a=1-f.reset;
  if(f.id==='support'){
    // Laptop screen is tilted at -3.5 deg horizontal, +5.5 deg vertical skew
    const rowY=75+Math.floor(f.progress*6)*11;
    const rowX=340+(rowY-75)*0.095;
    highlightBox(ctx,rowX,rowY,86,10,a*.75,'#0755ff',-3.5,5.5);
    // Open OptiPlex drive bays are angled at +10.2 deg and +12.4 deg in 3D perspective
    if(f.phase!=='intake'){
      highlightBox(ctx,670,135,58,22,a*(f.phase==='verify'?.92:.58),'#00a8e8',10.2,0);
      highlightBox(ctx,671,183,56,26,a*(f.phase==='verify'?.88:.48),'#059669',12.4,0);
      pulseRing(ctx,606,149,16,a*.55,'#00a8e8',-4,1.35);
    }
  }
  if(f.id==='systems'){
    // Top 48-port switch status LEDs (507..526, 29..37) & Core switch ports (389..485, 86)
    const portX=394+Math.floor((f.loopMs/180)%10)*9.2;
    pulseRing(ctx,portX,86,3.8,a*.78,'#00a8e8');
    pulseRing(ctx,515,29,3.5,a*.72,'#10b981');
    // Server 1 (y=129..178) & Server 2 (y=181..232) drive caddies & status LEDs
    pulseRing(ctx,465,142,3.5,a*.78,'#10b981');
    pulseRing(ctx,529,160,3.8,a*(f.phase==='coupled'?.92:.48),'#0755ff');
    pulseRing(ctx,465,194,3.5,a*(f.phase==='separated'?.92:.52),'#10b981');
    pulseRing(ctx,529,212,3.8,a*(f.phase==='separated'?.95:.48),'#00a8e8');
  }
  if(f.id==='infrastructure'){
    // 24-Port Patch Panel slopes downward at +3.16 deg from (414,61) to (686,76)
    const pIdx=Math.floor((f.loopMs/160)%14);
    const px=478+pIdx*14.8;
    const py=65+(px-478)*0.055;
    highlightBox(ctx,px,py,11,10,a*.76,'#00a8e8',3.16,0);
    // Floorplan blueprint nodes lie on a plane tilted +5.94 deg with -28 deg perspective skew
    const planNodes=[[278,204,'#0755ff'],[312,174,'#0755ff'],[377,186,'#00a8e8'],[396,146,'#0755ff'],[496,187,'#00a8e8'],[453,255,'#0755ff'],[585,196,'#d97706'],[549,258,'#00a8e8']];
    planNodes.forEach(([nx,ny,col],idx)=>{
      const pulse=0.45+0.55*Math.sin(f.progress*Math.PI*4+idx*0.9);
      highlightBox(ctx,nx,ny,13,9,a*pulse*.82,col,5.94,-28);
    });
    // UPS front bezel LEDs at (833, 66) green, (833, 78) amber, and power button (833, 96)
    pulseRing(ctx,833,66,4.5,a*(f.phase==='power'?1:.62),'#10b981',4.5,1);
    pulseRing(ctx,833,78,4.2,a*(f.phase==='power'?.95:.48),'#f59e0b',4.5,1);
    if(f.phase==='power')pulseRing(ctx,833,96,7.5,a*.72,'#00a8e8',4.5,1);
  }
  if(f.id==='analysis'){
    // Left paper form highlight angled at -16.7 deg
    highlightBox(ctx,208,177,82,9,a*(f.phase==='request'?.9:.42),'#0755ff',-16.7,-18);
    // Right spiral notebook flowchart boxes angled at +11.8 deg with -24 deg spine skew
    highlightBox(ctx,848,184,36,15,a*(f.phase==='eligible'?.85:.38),'#0755ff',11.8,-24);
    highlightDiamond(ctx,832,241,13,a*(f.phase==='refer'?.9:.42),'#d97706',11.8,0.68);
  }
  if(f.id==='solutions'){
    // Left monitor SQL table rows slope subtly from 0 deg at top to -1.5 deg at bottom
    const rIdx=Math.floor((f.loopMs/220)%14);
    const ry=72+rIdx*13;
    const rTilt=-0.2-(ry-72)*0.007;
    highlightBox(ctx,276,ry,152,9,a*.68,'#0755ff',rTilt,0);
    // Right monitor schema headers tilted along right monitor perspective (+0.5 to +2.2 deg)
    highlightBox(ctx,689,40,42,10,a*(f.phase==='mapping'?.88:.4),'#0755ff',0.5,0);
    highlightBox(ctx,785,73,44,10,a*(f.phase==='mapping'?.9:.4),'#00a8e8',0.8,0);
    highlightBox(ctx,796,164,46,11,a*(f.phase==='continuity'?.94:.42),'#10b981',2.2,0);
  }
}
function nativeDetail(ctx,id,f){
  const a=1-f.reset,p=NATIVE_PATHS[id];
  if(id==='support'){
    // Selected item in left sidebar (-3.5 deg tilt)
    highlightBox(ctx,259,111,64,9,a*(f.phase==='intake'?.95:.55),'#0755ff',-3.5,5.5);
    strokePartial(ctx,p.tree,f.phase==='intake'?f.phaseProgress:1,'#0755ff',2.2,a*.85);
    if(f.phase!=='intake'){
      highlightBox(ctx,342,119,68,12,a*.85,'#00a8e8',-3.8,5.5);
      strokePartial(ctx,p.detail,f.phase==='narrow'?f.phaseProgress:1,'#00a8e8',2.6,a*.88);
    }
    if(f.phase==='verify'){
      // Bottom progress bar on laptop screen (-4.95 deg tilt)
      highlightBox(ctx,370,185,106,8,a*f.phaseProgress*.92,'#059669',-4.95,5.5);
      strokePartial(ctx,p.chassis,f.phaseProgress,'#10b981',2.4,a*.88);
      pulseRing(ctx,678,92,8,a*f.phaseProgress,'#10b981',8,1);
    }
  }else if(id==='systems'){
    strokePartial(ctx,p.rack,clamp(f.progress*1.3),'#00a8e8',2.0,a*.78);
    strokePartial(ctx,p.trunk,f.phase==='coupled'?f.phaseProgress:1,'#0755ff',2.4,a*.88);
    highlightBox(ctx,825,91,59,19,a*.85,'#0755ff',0.4,0);
    if(f.phase!=='coupled'){
      strokePartial(ctx,p.ad,f.phase==='stage'?f.phaseProgress:1,'#0755ff',2.3,a*.88);
      strokePartial(ctx,p.firewall,f.phase==='stage'?f.phaseProgress:1,'#00a8e8',2.0,a*.82);
      highlightDiamond(ctx,906,150,18,a*(f.phase==='stage'?f.phaseProgress:.88),'#0755ff',0.8,1);
      highlightBox(ctx,825,183,28,27,a*.82,'#00a8e8',0.8,0);
    }
    if(f.phase==='separated'){
      strokePartial(ctx,p.mail,f.phaseProgress,'#10b981',2.3,a*.92);
      highlightBox(ctx,743,148,32,24,a*f.phaseProgress,'#10b981',0.6,0);
      highlightBox(ctx,743,185,58,11,a*f.phaseProgress*.85,'#10b981',1.0,0);
      highlightBox(ctx,906,188,58,11,a*f.phaseProgress*.85,'#0755ff',1.2,0);
    }
  }else if(id==='infrastructure'){
    const net=f.phase==='network'?f.phaseProgress:1;
    const svc=f.phase==='services'?f.phaseProgress:(f.phase==='power'?1:0);
    const pwr=f.phase==='power'?f.phaseProgress:0;
    strokePartial(ctx,p.network,net,'#0755ff',2.5,a*.92);
    if(svc>0){
      strokePartial(ctx,p.services,svc,'#00a8e8',2.4,a*.88);
      strokePartial(ctx,p.security,svc,'#0755ff',2.2,a*.84);
    }
    if(pwr>0){
      strokePartial(ctx,p.power,pwr,'#10b981',2.5,a*.92);
      highlightBox(ctx,565,70,215,24,a*pwr*.78,'#0755ff',3.16,0);
    }
  }else if(id==='analysis'){
    strokePartial(ctx,p.form,f.phase==='request'?f.phaseProgress:1,'#0755ff',2.4,a*.84);
    strokePartial(ctx,p.request,f.phase==='request'?f.phaseProgress:1,'#0755ff',2.3,a*.9);
    highlightBox(ctx,430,48,33,14,a*(f.phase==='request'?.95:.55),'#0755ff',0.2,0);
    highlightBox(ctx,489,48,33,14,a*(f.phase==='request'?f.phaseProgress:.65),'#0755ff',0.2,0);
    if(f.phase!=='request'){
      strokePartial(ctx,p.eligible,f.phase==='eligible'?f.phaseProgress:1,'#00a8e8',2.3,a*.9);
      highlightBox(ctx,457,90,33,15,a*.75,'#0755ff',0.25,0);
      highlightDiamond(ctx,529,90,13,a*.92,'#00a8e8',0.25,1);
      highlightBox(ctx,568,90,24,15,a*(f.phase==='eligible'?f.phaseProgress:.82),'#10b981',0.25,0);
    }
    if(f.phase==='refer'){
      strokePartial(ctx,p.refer,f.phaseProgress,'#d97706',2.3,a*.92);
      strokePartial(ctx,p.notebook,f.phaseProgress,'#0755ff',2.0,a*.78);
      highlightDiamond(ctx,487,136,13,a*f.phaseProgress,'#d97706',0.3,1);
      highlightBox(ctx,563,138,33,15,a*f.phaseProgress,'#0755ff',0.3,0);
      highlightBox(ctx,429,159,34,14,a*f.phaseProgress,'#d97706',0.3,0);
    }
  }else if(id==='solutions'){
    strokePartial(ctx,p.sql,f.phase==='sql'?f.phaseProgress:1,'#0755ff',2.2,a*.88);
    strokePartial(ctx,p.bars,f.phase==='sql'?f.phaseProgress:1,'#00a8e8',2.2,a*.84);
    highlightBox(ctx,277,53,156,9,a*(f.phase==='sql'?.92:.55),'#0755ff',0.1,0);
    if(f.phase!=='sql'){
      strokePartial(ctx,p.mapping,f.phase==='mapping'?f.phaseProgress:1,'#0755ff',2.3,a*.9);
      highlightBox(ctx,611,85,42,54,a*.72,'#0755ff',0.4,0);
      highlightBox(ctx,689,70,42,69,a*(f.phase==='mapping'?f.phaseProgress:.78),'#00a8e8',0.5,0);
      highlightBox(ctx,682,169,52,94,a*(f.phase==='mapping'?f.phaseProgress:.78),'#0755ff',1.8,0);
    }
    if(f.phase==='continuity'){
      strokePartial(ctx,p.continuity,f.phaseProgress,'#10b981',2.4,a*.94);
      strokePartial(ctx,p.notes,f.phaseProgress,'#0755ff',2.0,a*.78);
      highlightDiamond(ctx,736,145,9,a*f.phaseProgress,'#d97706',1.2,1);
      highlightBox(ctx,785,101,46,66,a*f.phaseProgress*.88,'#00a8e8',0.8,0);
      highlightBox(ctx,796,200,47,84,a*f.phaseProgress*.95,'#10b981',2.2,0);
    }
  }
}
function drawScene(s,ms){
  const ctx=s.ctx,sp=s.spec,f=frameAt(sp.id,ms);
  ctx.clearRect(0,0,1024,sp.height);ctx.drawImage(s.image,0,sp.y,1024,sp.height,0,0,1024,sp.height);
  if(s.compare)return f;
  nativeDetail(ctx,sp.id,f);lamps(ctx,f);
  ctx.save();ctx.globalAlpha=.65*(1-f.reset);const crop=s.mobile?s.spec.mobile:s.spec.desktop;
  ctx.fillStyle='#0755ff';ctx.fillRect(crop.x,sp.height-3,crop.width*f.progress,2);ctx.restore();
  return f;
}
function recordScene(s){
  if(!s.canvas.captureStream||typeof MediaRecorder==='undefined')return;
  const stream=s.canvas.captureStream(FPS),types=['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm'];
  const mimeType=types.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
  const rec=new MediaRecorder(stream,mimeType?{mimeType,videoBitsPerSecond:8000000}:{videoBitsPerSecond:8000000}),chunks=[];
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  rec.onstop=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(chunks,{type:rec.mimeType||'video/webm'}));a.download=`josh-boyer-${s.spec.id}-living-scene.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);};
  s.manual=true;s.compare=false;s.paused=false;rec.start();setTimeout(()=>{if(rec.state==='recording')rec.stop();},12200);
}
function mount(){
  if(typeof document==='undefined')return null;
  const figures=[...document.querySelectorAll('[data-living-scene]')].filter(figure=>{const legacy=figure.closest('#hero-journey');return !legacy||window.getComputedStyle(legacy).display!=='none';});if(!figures.length)return null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),mobile=window.matchMedia('(max-width: 767px)');
  const saveData=Boolean(navigator.connection&&navigator.connection.saveData),master=document.getElementById('motion-master');
  const image=new Image();image.decoding='async';let loaded=false,globalPaused=false,timer=0,active=null,clock=0;
  const scenes=figures.map(figure=>{
    const spec=getSpec(figure.dataset.livingScene),canvas=figure.querySelector('canvas'),play=figure.querySelector('[data-living-play]'),compare=figure.querySelector('[data-living-compare]'),status=figure.querySelector('[data-living-status]');
    const ctx=canvas.getContext('2d',{alpha:false});
    const s={id:spec.id,spec,figure,canvas,ctx,image,play,compareBtn:compare,status,loaded:false,visible:true,hidden:document.hidden,homeHidden:false,reduced:reduced.matches,mobile:mobile.matches,saveData,manual:false,paused:false,compare:false,autoPaused:false,center:0,ms:0};
    play?.addEventListener('click',()=>{
      if(!s.loaded)return;
      if(s.compare){s.compare=false;compare?.setAttribute('aria-pressed','false');}
      const running=active===s&&allowed(s);
      if(running){s.paused=true;s.manual=false;}else{scenes.forEach(o=>{if(o!==s)o.manual=false;});globalPaused=false;s.paused=false;s.autoPaused=false;s.manual=true;}
      sync();
    });
    compare?.addEventListener('click',()=>{
      s.compare=!s.compare;compare.setAttribute('aria-pressed',String(s.compare));
      if(s.compare)s.manual=false;sync();
    });
    figure.addEventListener('dblclick',e=>{if(e.shiftKey&&s.loaded)recordScene(s);});
    return s;
  });
  function updateCenters(){
    const home=document.querySelector('[data-page="home"]');
    const homeHidden=Boolean(home&&home.hidden);
    for(const s of scenes){
      const r=s.figure.getBoundingClientRect();
      s.center=r.top+r.height/2;s.visible=r.bottom>80&&r.top<window.innerHeight-60;
      s.hidden=document.hidden;s.homeHidden=homeHidden;s.reduced=reduced.matches;s.mobile=mobile.matches;
      s.autoPaused=globalPaused;
    }
  }
  function renderStill(s){
    if(!s.loaded)return;
    s.canvas.hidden=s.compare;
    if(!s.compare)drawScene(s,s.ms);
  }
  function updateUi(){
    if(master){master.textContent=globalPaused?'Resume motion':'Pause all motion';master.setAttribute('aria-pressed',String(globalPaused));}
    for(const s of scenes){
      const isRunning=active===s&&allowed(s);
      if(s.play){s.play.disabled=!s.loaded;s.play.textContent=isRunning?'Pause':'Play';s.play.setAttribute('aria-pressed',String(isRunning));}
      const f=frameAt(s.id,s.ms);
      let text='Original image';
      if(s.loaded&&!s.compare)text=isRunning?`Playing · ${f.label}`:(s.reduced||s.mobile?'Still by default · press Play':`Paused · ${f.label}`);
      if(s.status)s.status.textContent=text;
      s.figure.dataset.motionState=s.compare?'original-comparison':(isRunning?'playing':'paused');
    }
  }
  function tick(now){
    if(!active||!allowed(active)){stopLoop();updateUi();return;}
    const dt=clock?Math.min(100,now-clock):1000/FPS;clock=now;active.ms=(active.ms+dt)%CYCLE_MS;
    active.canvas.hidden=false;const f=drawScene(active,active.ms);
    active.canvas.dataset.phase=f.phase;active.canvas.dataset.loopMs=String(Math.round(f.loopMs));
    updateUi();timer=window.setTimeout(()=>requestAnimationFrame(tick),1000/FPS);
  }
  function stopLoop(){if(timer){clearTimeout(timer);timer=0;}clock=0;}
  function sync(){
    updateCenters();
    active=chooseActive(scenes,window.innerHeight/2);
    for(const s of scenes){if(s!==active||!allowed(s))renderStill(s);}
    stopLoop();
    if(active&&allowed(active))requestAnimationFrame(tick);
    updateUi();
  }
  image.onload=()=>{loaded=true;scenes.forEach(s=>{s.loaded=true;renderStill(s);});sync();};
  image.src=IMAGE_SRC;
  master?.addEventListener('click',()=>{globalPaused=!globalPaused;if(globalPaused)scenes.forEach(s=>{s.manual=false;});sync();});
  window.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',sync);
  document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>{stopLoop();});
  reduced.addEventListener?.('change',sync);mobile.addEventListener?.('change',sync);
  if('IntersectionObserver'in window){const io=new IntersectionObserver(sync,{threshold:[0,.15,.5]});scenes.forEach(s=>io.observe(s.figure));}
  if('MutationObserver'in window){const home=document.querySelector('[data-page="home"]');if(home)new MutationObserver(sync).observe(home,{attributes:true,attributeFilter:['hidden']});}
  sync();return{scenes,sync};
}
return{FPS,CYCLE_MS,ACTIVE_MS,SCENES,PLAN_PATHS,NATIVE_PATHS,frameAt,allowed,chooseActive,pointOnPath,mount};
});
