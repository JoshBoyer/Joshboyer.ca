(function(){
  'use strict';
  const $=id=>document.getElementById(id),api=globalThis.CareerGuide,voice=globalThis.TwinVoice;
  const question=$('guide-question'),posting=$('guide-posting'),profile=$('guide-profile'),log=$('guide-conversation');
  const defaults={explore_evidence:'Tell me about Josh',compare_job:'Compare this posting with Josh’s approved experience.',prepare_resume:'Prepare a resume from the approved evidence for this posting.'};
  let data,session,action='explore_evidence',revision=0,sessionToken='',turnsUsed=0,autoSpeak=false,isRecording=false,isLiveCall=false;
  let serverState={reachable:false,mode:'rule-based',llmProvider:'local-deterministic',voice:{sttEnabled:false,ttsEnabled:false,liveAgentEnabled:false}};
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const status=text=>$('guide-status').textContent=text;
  function error(text){$('guide-error').textContent=text;$('guide-error').hidden=!text;}
  function currentTurns(){return serverState.reachable?turnsUsed:(session?session.turns:0);}
  function counts(){
    $('question-count').textContent=question.value.length+' / 1,000 characters';
    $('guide-posting-count').textContent=posting.value.length+' / 12,000 characters';
    $('guide-turns').textContent=currentTurns()+' / '+api.LIMITS.turns+' turns';
    $('guide-send').disabled=(!session&&!serverState.reachable)||currentTurns()>=api.LIMITS.turns;
  }
  function invalidateExports(){revision++;for(const b of document.querySelectorAll('[data-guide-export]'))b.disabled=true;}
  function clearConversation(clearInputs,notice){
    invalidateExports();log.replaceChildren();$('guide-welcome').hidden=false;if(session)session.clear();turnsUsed=0;error('');
    if(voice){voice.stopSpeaking();voice.stopRecording();voice.stopLiveCall();}
    if(clearInputs){question.value='';posting.value='';profile.value='auto';choose('explore_evidence',false);question.value='';}
    if(serverState.reachable){
      fetch('/api/twin/clear',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.ok?r.json():null).then(d=>{if(d?.sessionToken)sessionToken=d.sessionToken;}).catch(()=>{});
    }
    counts();if(notice)status(notice);
  }
  function choose(next,focus=true,fillDefault=true){
    action=next;invalidateExports();
    for(const input of document.querySelectorAll('[data-action]'))input.checked=input.dataset.action===action;
    if(fillDefault&&(!question.value.trim()||Object.values(defaults).includes(question.value)))question.value=defaults[action];
    $('guide-send').textContent=action==='explore_evidence'?'Send question':action==='compare_job'?'Compare posting':'Prepare resume';
    if(action!=='explore_evidence'){$('posting-context').open=true;if(focus&&!posting.value.trim())posting.focus();}
    else if(focus)question.focus();
    counts();error('');
  }
  function sourceLink(source){const a=el('a',source.id);a.href=source.path;return a;}
  function evidence(c){
    const a=el('article',undefined,'guide-evidence');a.append(el('h4',c.title),el('p',c.employer+' · '+c.period,'evidence-context'),el('p',c.text));
    const details=el('details'),summary=el('summary','Decision, process and limits');details.append(summary,el('p',c.decision));
    const steps=el('ul');for(const step of (c.process||[]))steps.append(el('li',step));details.append(steps,el('p',c.guidance),el('p',c.outcome));
    for(const note of (c.limits||[]))details.append(el('p',note));a.append(details);
    for(const source of (c.sources||[]))a.append(sourceLink(source));return a;
  }
  function download(name,type,text){
    const url=URL.createObjectURL(new Blob([text],{type})),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function render(response,sent){
    $('guide-welcome').hidden=true;
    const user=el('article',undefined,'guide-user');user.append(el('p','Your question','message-label'),el('p',sent));
    const reply=el('article',undefined,'guide-reply'),heading=el('h3',response.heading);heading.tabIndex=-1;
    reply.append(heading);

    const speakText=response.spokenSummary||response.replyMarkdown||response.intro||'';
    if(speakText&&voice){
      const listenBtn=el('button','🔊 Listen to reply','twin-speak-reply-btn');
      listenBtn.type='button';
      listenBtn.style.marginBottom='14px';
      listenBtn.addEventListener('click',()=>{
        voice.speak(speakText,{
          serverTtsEnabled:serverState.voice.ttsEnabled,
          onStart:()=>{listenBtn.textContent='⏹ Stop audio';},
          onEnd:()=>{listenBtn.textContent='🔊 Listen to reply';}
        });
      });
      reply.append(listenBtn);
    }

    const bodyProse=response.replyMarkdown||response.intro||'';
    for(const para of bodyProse.split(/\n{2,}/)){
      const clean=para.replace(/\*\*([^*]+)\*\*/g,'$1').trim();
      if(clean)reply.append(el('p',clean));
    }

    if(response.requirementCount){
      reply.append(el('p',response.relatedCount+' of '+response.requirementCount+' posting lines have related topics. '+response.unrecognizedCount+' have no recognized topic. This is not a fit score.'));
      const rows=el('ol',undefined,'guide-topic-rows');for(const row of response.rows)rows.append(el('li','Posting line '+row.line+': '+(row.topics.length?row.topics.join('; '):'No recognized topic')+'. '+(row.evidenceIds.length?'Related IDs: '+row.evidenceIds.join(', '):'No related evidence selected.')));reply.append(rows);
      if(response.rows.length<response.requirementCount)reply.append(el('p','Showing the first '+response.rows.length+' of '+response.requirementCount+' topic rows. Use the full resume builder for every line.','guide-help'));
    }
    if(response.qualifications?.length){
      const box=el('section',undefined,'guide-qualifications');box.append(el('h4','Qualifications to confirm'));const list=el('ul');
      for(const q of response.qualifications){const li=el('li');li.append(el('strong',q.label+': '),document.createTextNode(q.note));list.append(li);}box.append(list);reply.append(box);
    }
    if(response.resumeText){
      const details=el('details',undefined,'guide-resume');details.open=true;details.append(el('summary','Read the prepared resume'),el('pre',response.resumeText));reply.append(details);
      reply.append(el('p','Review these '+response.selection.selectedIds.length+' selected chunks and the qualifications before using this resume. The full builder lets you change the selection.','guide-help'));
      const exports=el('div',undefined,'guide-downloads'),current=revision;
      for(const item of [{label:'Download resume .txt',name:'Josh-Boyer-guide-resume.txt',type:'text/plain;charset=utf-8',text:response.resumeText},{label:'Export selection JSON',name:'Josh-Boyer-guide-selection.json',type:'application/json',text:JSON.stringify(response.selection,null,2)+'\n'}]){
        const b=el('button',item.label);b.type='button';b.setAttribute('data-guide-export','');b.addEventListener('click',()=>{if(current!==revision){status('The inputs changed. Prepare the resume again before exporting.');return;}download(item.name,item.type,item.text);status(item.label+' download requested. Posting and question text are excluded.');});exports.append(b);
      }reply.append(exports);
    }
    for(const c of (response.chunks||[]))reply.append(evidence(c));
    const modeLabel=response.mode==='ai'?('Governed AI ('+response.provider+')'):'Grounded Rule Engine';
    const full=el('a','Open the full resume builder','full-builder-link');full.href='resume.html';reply.append(full,el('p',modeLabel+' · Evidence '+(response.datasetVersion||'2026-10-15.3'),'guide-count'));
    log.append(user,reply);heading.focus();counts();
    const rem=api.LIMITS.turns-currentTurns();
    status(rem<=0?'Eight-turn limit reached. Clear the conversation to start again.':'Answered from approved evidence. '+rem+' turns remain.');
    if(autoSpeak&&speakText&&voice){
      voice.speak(speakText,{serverTtsEnabled:serverState.voice.ttsEnabled});
    }
  }

  $('guide-form').addEventListener('submit',async event=>{
    event.preventDefault();error('');if(!session&&!serverState.reachable)return;
    const sentText=question.value.trim()||defaults[action];
    if(serverState.reachable){
      try{
        $('guide-send').disabled=true;
        status('Synthesizing grounded response…');
        const res=await fetch('/api/twin/chat',{
          method:'POST',
          credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action,question:question.value,posting:posting.value,profile:profile.value,activeRoute:'#career-guide',sessionToken})
        });
        const payload=await res.json();
        if(!res.ok)throw new Error(payload?.error||'Could not process request.');
        sessionToken=payload.sessionToken||sessionToken;
        turnsUsed=payload.turnsUsed??(turnsUsed+1);
        invalidateExports();
        render(payload,sentText);
        return;
      }catch(e){
        if(!session){
          error(e.message);
          counts();
          return;
        }
        // If network failed but local session exists, fall back to local deterministic engine unless it was a 400 validation error
        if(/characters|turns|Wait|Paste|Choose|Ask at least/i.test(e.message)){
          error(e.message);
          if(action!=='explore_evidence'&&posting.value.trim().length<20){$('posting-context').open=true;posting.focus();}
          counts();
          return;
        }
      }
    }
    try{
      const response=session.send({action,question:question.value,posting:posting.value,profile:profile.value,datasetVersion:data.datasetVersion});
      turnsUsed=session.turns;
      invalidateExports();
      render(response,sentText);
    }catch(e){
      error(e.message);
      if(action!=='explore_evidence'&&posting.value.trim().length<20){$('posting-context').open=true;posting.focus();}
      counts();
    }
  });

  // Voice Controls on /career-guide
  const micBtn=$('guide-mic-btn'),autoSpeakBtn=$('guide-autospeak-btn'),liveCallBtn=$('guide-live-call-btn');
  if(autoSpeakBtn){
    autoSpeakBtn.addEventListener('click',()=>{
      autoSpeak=!autoSpeak;
      autoSpeakBtn.setAttribute('aria-pressed',String(autoSpeak));
      autoSpeakBtn.textContent=autoSpeak?'🔊 Auto-Voice On':'🔈 Auto-Voice Off';
      if(!autoSpeak&&voice)voice.stopSpeaking();
    });
  }
  if(micBtn&&voice){
    micBtn.addEventListener('click',async ()=>{
      if(isRecording){
        voice.stopRecording();isRecording=false;micBtn.classList.remove('is-active');micBtn.textContent='🎤 Speak Question';return;
      }
      isRecording=true;micBtn.classList.add('is-active');micBtn.textContent='⏹ Stop Recording';
      status(serverState.voice.sttEnabled?'Listening (ElevenLabs Scribe)…':'Listening (Browser STT)…');
      await voice.startRecording({
        serverSttEnabled:serverState.voice.sttEnabled,
        onInterim:txt=>{question.value=txt;counts();},
        onResult:txt=>{question.value=txt;counts();$('guide-form').requestSubmit();},
        onError:err=>{error(err.message);},
        onStop:()=>{isRecording=false;micBtn.classList.remove('is-active');micBtn.textContent='🎤 Speak Question';}
      });
    });
  }
  if(liveCallBtn&&voice){
    liveCallBtn.addEventListener('click',async ()=>{
      if(isLiveCall){
        voice.stopLiveCall();isLiveCall=false;liveCallBtn.classList.remove('is-active');liveCallBtn.setAttribute('aria-pressed','false');liveCallBtn.textContent='🎙️ Live Voice Call';status('Live Voice Call ended.');return;
      }
      isLiveCall=true;liveCallBtn.classList.add('is-active');liveCallBtn.setAttribute('aria-pressed','true');liveCallBtn.textContent='⏹ End Live Call';
      await voice.startLiveCall({
        activeRoute:'#career-guide',
        sessionToken,
        onStatusChange:(_st,lbl)=>status(lbl),
        onTranscript:({role,text})=>{
          if(role==='agent')render({heading:'Josh Boyer (Live Voice Twin)',replyMarkdown:text,spokenSummary:'',chunks:[],qualifications:[],datasetVersion:data?.datasetVersion||'2026-10-15.3'},'(Live Voice Conversation)');
        },
        onError:err=>{error(err.message);},
        onClose:()=>{isLiveCall=false;liveCallBtn.classList.remove('is-active');liveCallBtn.setAttribute('aria-pressed','false');liveCallBtn.textContent='🎙️ Live Voice Call';}
      });
    });
  }

  for(const b of document.querySelectorAll('[data-action]'))b.addEventListener('change',()=>{if(b.checked)choose(b.dataset.action);});
  for(const b of document.querySelectorAll('[data-example]'))b.addEventListener('click',()=>{choose('explore_evidence',false);question.value=b.dataset.example;counts();$('guide-form').requestSubmit();});
  question.addEventListener('input',()=>{invalidateExports();counts();error('');});
  posting.addEventListener('input',()=>clearConversation(false,'Posting changed. Send again to use the new text.'));
  profile.addEventListener('change',()=>clearConversation(false,'Emphasis changed. Send again to rebuild the response.'));
  for(const [field,limit,name]of [[question,1000,'question'],[posting,12000,'posting']])field.addEventListener('paste',event=>{
    const text=event.clipboardData?.getData('text/plain');if(text!==undefined&&field.value.length-(field.selectionEnd-field.selectionStart)+text.length>limit){event.preventDefault();error('The pasted '+name+' exceeds '+limit.toLocaleString('en-US')+' characters. Shorten it and try again.');}
  });
  $('guide-example-posting').addEventListener('click',()=>{posting.value='Illustrative posting, not an actual vacancy. Insurance integration analyst reviewing provider requirements, SOAP and REST interfaces, XML mapping, SQL and claims reconciliation. Kafka and AWS certification are required.';clearConversation(false,'Illustrative posting added. Choose an action and send.');});
  $('guide-clear').addEventListener('click',()=>{clearConversation(true,'Conversation, posting and exports cleared.');question.focus();});
  const nativeAction=()=>document.querySelector('input[name="guide-action"]:checked')?.value||'explore_evidence';
  window.addEventListener('pageshow',()=>requestAnimationFrame(()=>{if(session){choose(nativeAction(),false,false);}}));

  Promise.all([
    fetch('career-evidence.v3.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('load');return r.json();}),
    fetch('/api/twin/status',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([d,st])=>{
    globalThis.ResumeEngine.validate(d);data=d;session=api.createSession(data);
    if(st&&st.ok){
      serverState.reachable=true;
      serverState.mode=st.mode||'rule-based';
      serverState.llmProvider=st.llmProvider||'local-deterministic';
      serverState.voice=st.voice||{sttEnabled:false,ttsEnabled:false,liveAgentEnabled:false};
      turnsUsed=st.session?.turnsUsed||0;
      sessionToken=st.session?.sessionToken||'';
      const banner=$('guide-mode-banner');
      if(banner){
        banner.textContent=(serverState.mode==='ai'?'Governed AI Twin ('+serverState.llmProvider+')':'Governed Evidence Twin')+' · Session memory active · Dataset '+data.datasetVersion;
      }
      if(Array.isArray(st.session?.recentExchanges)&&st.session.recentExchanges.length){
        for(const ex of st.session.recentExchanges){
          render({heading:'Restored from active session',replyMarkdown:ex.spokenSummary,spokenSummary:'',chunks:[],qualifications:[],datasetVersion:data.datasetVersion},ex.question);
        }
      }
    }
    choose(nativeAction(),false,false);counts();
    status('Ready. Approved evidence '+data.datasetVersion+'. Choose an example, type a question, or use Voice.');
  }).catch(()=>{
    error('Approved evidence could not load. Reload this page and try again.');
    status('No answer or export is available until the evidence loads.');
  });
})();
