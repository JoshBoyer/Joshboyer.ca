(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CareerTree=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
  function geometry(nodes,width){
    if(!nodes.length)return {trunk:'',branches:[],start:0,end:0};
    const x=nodes[0].x,start=Math.max(0,nodes[0].y-24),end=nodes.at(-1).bottom+28;
    const branches=nodes.map(n=>{
      const edge=n.left-8;
      if(width<=700)return `M${x} ${n.y} V${n.top-24} L${x+12} ${n.top-12} H${edge}`;
      const elbow=Math.min(16,Math.max(4,(edge-x)/3));
      return `M${x} ${n.y} H${x+elbow} L${x+elbow*2} ${n.y+elbow} H${edge}`;
    });
    return {trunk:`M${x} ${start} V${end}`,branches,start,end};
  }
  function progress(top,height,viewport,start,end,reduced){return reduced?1:clamp((viewport*.42-top-start)/Math.max(1,end-start));}
  return {clamp,geometry,progress};
});

if(typeof window!=='undefined'&&typeof document!=='undefined')(()=>{
  const tree=document.querySelector('[data-career-tree]');if(!tree)return;
  const clamp=window.CareerTree.clamp;
  const rows=Array.from(tree.querySelectorAll('[data-tree-phase]'));
  if(rows[0]&&!tree.querySelector('.tree-phase[data-current="true"]')){
    rows[0].setAttribute('data-current','true');
  }
  const svg=tree.querySelector('.career-lines'),track=svg.querySelector('[data-tree-track]'),ink=svg.querySelector('[data-tree-ink]'),forward=svg.querySelector('[data-tree-forward]');
  const branches=Array.from(svg.querySelectorAll('[data-tree-branch]'));
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');

  // Wrap .career-introduction and .career-tree in a tall scroll-stage track so the one-line header, rail, and stage stay in one view while scrolling
  let scrollStage=tree.parentElement?.classList.contains('career-scroll-stage')?tree.parentElement:null;
  if(!scrollStage&&tree.parentNode){
    const intro=tree.parentNode.querySelector('.career-introduction');
    scrollStage=document.createElement('div');
    scrollStage.className='career-scroll-stage';
    scrollStage.setAttribute('data-career-scroll-stage','');
    tree.parentNode.insertBefore(scrollStage,intro||tree);
    if(intro)scrollStage.appendChild(intro);
    scrollStage.appendChild(tree);
  }

  let frame=null,shape,pinnedPhase=null,pinTimeout=null,lastActive=0;
  const MOBILE_BP=768;
  const PAUSE_WEIGHT=1.0;
  const SLIDE_WEIGHT=0.55;
  svg.setAttribute('preserveAspectRatio','none');

  function getStickyTop(){
    if(window.innerWidth<=MOBILE_BP)return 90;
    if(window.innerWidth<=1100)return 132;
    return 154;
  }

  function getStableScrollSpan(stageRect){
    const stickyTop=getStickyTop();
    const viewportAvailable=Math.max(420,window.innerHeight-stickyTop);
    return Math.max(1,stageRect.height-viewportAvailable);
  }

  function easeInOutCubic(t){
    return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  }

  // Maps rawProgress [0..1] on mobile into { active, continuousPhase, isPaused }
  // where each milestone slides in right-to-left, pauses on a plateau, then slides to the next.
  function computeMobileSlideState(rawP,count){
    if(count<=1)return {active:0,continuousPhase:0,isPaused:true};
    const stepUnit=PAUSE_WEIGHT+SLIDE_WEIGHT;
    const totalUnits=count*PAUSE_WEIGHT+(count-1)*SLIDE_WEIGHT;
    const u=clamp(rawP)*totalUnits;
    const idx=Math.min(count-1,Math.floor(u/stepUnit));
    const localU=u-idx*stepUnit;

    if(localU<=PAUSE_WEIGHT||idx>=count-1){
      return {active:idx,continuousPhase:idx,isPaused:true};
    }
    const slideT=clamp((localU-PAUSE_WEIGHT)/SLIDE_WEIGHT);
    const eased=easeInOutCubic(slideT);
    return {
      active:eased>=0.5?idx+1:idx,
      continuousPhase:idx+eased,
      isPaused:false
    };
  }

  function render(){
    frame=null;
    const initialBox=tree.getBoundingClientRect();
    if(!initialBox.width||!initialBox.height)return;

    const isMobile=window.innerWidth<=MOBILE_BP;
    const stickyTop=getStickyTop();
    const stageBox=scrollStage?scrollStage.getBoundingClientRect():initialBox;
    const scrollSpan=getStableScrollSpan(stageBox);
    const rawProgress=!media.matches
      ?clamp((stickyTop-stageBox.top)/scrollSpan)
      :0;

    let active=lastActive;
    let continuousPhase=lastActive;

    if(isMobile){
      if(pinnedPhase!==null){
        active=pinnedPhase;
        continuousPhase=pinnedPhase;
      }else if(!media.matches){
        const mState=computeMobileSlideState(rawProgress,rows.length);
        active=mState.active;
        continuousPhase=mState.continuousPhase;
      }
    }else{
      if(pinnedPhase!==null){
        active=pinnedPhase;
      }else if(!media.matches){
        const scaled=rawProgress*rows.length;
        const candidate=Math.min(rows.length-1,Math.floor(scaled));
        if(candidate!==lastActive){
          const boundary=candidate>lastActive?candidate:lastActive;
          if(Math.abs(scaled-boundary)>=0.04||rawProgress<=0.01||rawProgress>=0.99){
            active=candidate;
          }
        }
      }
      continuousPhase=active;
    }

    lastActive=active;

    for(let i=0;i<rows.length;i++){
      const current=i===active;
      const prev=rows[i].getAttribute('data-current')==='true';
      if(prev!==current)rows[i].setAttribute('data-current',String(current));
      rows[i].querySelector('[data-phase-go]').setAttribute('aria-current',current?'step':'false');
      branches[i].setAttribute('data-reached',String(i<=active));
      branches[i].setAttribute('data-active',String(current));
      if(current&&!prev){
        const vid=rows[i].querySelector('.timeline-exploded-video');
        if(vid&&vid.paused)vid.play?.().catch(()=>{});
      }

      const proofEl=rows[i].querySelector('.phase-proof');
      if(proofEl){
        if(isMobile&&!media.matches){
          const offset=i-continuousPhase;
          const clampedOffset=Math.max(-1.2,Math.min(1.2,offset));
          const tx=clampedOffset*105;
          const absOff=Math.abs(offset);
          const op=absOff>=1?0:(1-absOff*0.55);
          proofEl.style.transform=`translate3d(${tx.toFixed(2)}%, 0, 0)`;
          proofEl.style.opacity=op.toFixed(3);
          proofEl.style.visibility=absOff>0.98?'hidden':'visible';
          proofEl.style.pointerEvents=current?'auto':'none';
        }else{
          proofEl.style.transform='';
          proofEl.style.opacity='';
          proofEl.style.visibility='';
          proofEl.style.pointerEvents='';
        }
      }
    }

    if(isMobile){
      const denom=Math.max(1,rows.length-1);
      const mobileProg=clamp(continuousPhase/denom);
      tree.style.setProperty('--mobile-tree-progress',mobileProg.toFixed(4));
      tree.setAttribute('data-progress',mobileProg.toFixed(5));
      tree.setAttribute('data-motion',media.matches?'reduced':'normal');
      tree.setAttribute('data-active-phase',String(active));
      return;
    }

    tree.style.removeProperty('--mobile-tree-progress');
    const box=tree.getBoundingClientRect();
    const activeRow=rows[active]||rows[0];
    const activeProof=activeRow?activeRow.querySelector('.phase-proof').getBoundingClientRect():box;

    const nodes=rows.map(row=>{
      const dot=row.querySelector('.phase-node').getBoundingClientRect();
      const meta=row.querySelector('.phase-meta').getBoundingClientRect();
      return {
        x:dot.left+dot.width/2-box.left,
        y:dot.top+dot.height/2-box.top,
        left:Math.max(dot.right-box.left+20,activeProof.left-box.left),
        top:meta.top-box.top,
        bottom:meta.bottom-box.top
      };
    });

    shape=window.CareerTree.geometry(nodes,window.innerWidth);
    const firstY=nodes[0]?.y??0;
    const lastY=nodes.at(-1)?.y??0;
    shape.start=Math.max(0,firstY-14);
    shape.end=lastY+22;
    shape.trunk=`M${nodes[0].x} ${shape.start} V${shape.end}`;

    svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    track.setAttribute('d',shape.trunk);
    ink.setAttribute('d',shape.trunk);
    const x=nodes[0].x;
    forward?.setAttribute('d',`M${x-4} ${shape.end-6} L${x} ${shape.end} L${x+4} ${shape.end-6}`);
    for(let i=0;i<branches.length;i++)branches[i].setAttribute('d',shape.branches[i]);

    const length=Math.max(1,shape.end-shape.start);
    const targetNodeY=nodes[active]?.y??shape.start;
    const nextNodeY=nodes[Math.min(rows.length-1,active+1)]?.y??shape.end;
    const segFraction=pinnedPhase!==null?0:clamp((rawProgress*rows.length)-active);
    const currentInkY=targetNodeY+(nextNodeY-targetNodeY)*segFraction;
    const visualP=media.matches?1:clamp((currentInkY-shape.start)/length);

    ink.style.strokeDasharray=length+' '+length;
    ink.style.strokeDashoffset=String(length*(1-visualP));
    tree.setAttribute('data-progress',visualP.toFixed(5));
    tree.setAttribute('data-motion',media.matches?'reduced':'normal');
    tree.setAttribute('data-active-phase',String(active));
  }

  function refresh(){if(frame===null)frame=window.requestAnimationFrame(render);}

  function selectPhase(idx){
    const clampedIdx=Math.max(0,Math.min(rows.length-1,idx));
    pinnedPhase=clampedIdx;
    lastActive=clampedIdx;
    if(pinTimeout)clearTimeout(pinTimeout);
    pinTimeout=setTimeout(()=>{pinnedPhase=null;refresh();},750);

    if(scrollStage&&!media.matches){
      const stageRect=scrollStage.getBoundingClientRect();
      const span=getStableScrollSpan(stageRect);
      const stickyTop=getStickyTop();
      let targetProgress;
      if(window.innerWidth<=MOBILE_BP){
        const stepUnit=PAUSE_WEIGHT+SLIDE_WEIGHT;
        const totalUnits=rows.length*PAUSE_WEIGHT+(rows.length-1)*SLIDE_WEIGHT;
        const targetU=clampedIdx*stepUnit+(PAUSE_WEIGHT*0.45);
        targetProgress=clamp(targetU/totalUnits);
      }else{
        targetProgress=(clampedIdx+0.35)/rows.length;
      }
      const targetScrollY=window.scrollY+stageRect.top-stickyTop+(targetProgress*span);
      window.scrollTo({top:targetScrollY,behavior:'smooth'});
    }
    render();
    window.requestAnimationFrame(render);
  }

  // Allow horizontal swipe left/right on mobile to step to the next/previous milestone pause plateau
  let touchStartX=0,touchStartY=0;
  tree.addEventListener('touchstart',e=>{
    if(e.touches.length===1){
      touchStartX=e.touches[0].clientX;
      touchStartY=e.touches[0].clientY;
    }
  },{passive:true});
  tree.addEventListener('touchend',e=>{
    if(window.innerWidth>MOBILE_BP||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-touchStartX;
    const dy=e.changedTouches[0].clientY-touchStartY;
    if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.35){
      const nextIdx=dx<0?lastActive+1:lastActive-1;
      if(nextIdx>=0&&nextIdx<rows.length)selectPhase(nextIdx);
    }
  },{passive:true});

  rows.forEach((row,idx)=>{
    row.querySelector('[data-phase-go]').addEventListener('click',()=>{
      selectPhase(idx);
    });
    for(const disclosure of row.querySelectorAll('details'))disclosure.addEventListener('toggle',refresh);
  });

  window.addEventListener('scroll',refresh,{passive:true});
  window.addEventListener('resize',refresh,{passive:true});
  media.addEventListener?.('change',refresh);
  document.fonts?.ready?.then(refresh);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(refresh).observe(tree);
  window.CareerTreeView={refresh,selectPhase};
  refresh();
})();
