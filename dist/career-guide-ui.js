(function(){
  'use strict';
  const $=id=>document.getElementById(id),api=globalThis.CareerGuide;
  const question=$('guide-question'),posting=$('guide-posting'),profile=$('guide-profile'),log=$('guide-conversation');
  const defaults={explore_evidence:'Tell me about Josh',compare_job:'Compare this posting with Josh’s approved experience.',prepare_resume:'Prepare a resume from the approved evidence for this posting.'};
  let data,session,action='explore_evidence',revision=0;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const status=text=>$('guide-status').textContent=text;
  function error(text){$('guide-error').textContent=text;$('guide-error').hidden=!text;}
  function counts(){
    $('question-count').textContent=question.value.length+' / 1,000 characters';
    $('guide-posting-count').textContent=posting.value.length+' / 12,000 characters';
    $('guide-turns').textContent=(session?session.turns:0)+' / 8 turns';
    $('guide-send').disabled=!session||session.turns>=api.LIMITS.turns;
  }
  function invalidateExports(){revision++;for(const b of document.querySelectorAll('[data-guide-export]'))b.disabled=true;}
  function clearConversation(clearInputs,notice){
    invalidateExports();log.replaceChildren();$('guide-welcome').hidden=false;if(session)session.clear();error('');
    if(clearInputs){question.value='';posting.value='';profile.value='auto';choose('explore_evidence',false);question.value='';}
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
    const steps=el('ul');for(const step of c.process)steps.append(el('li',step));details.append(steps,el('p',c.guidance),el('p',c.outcome));
    for(const note of c.limits)details.append(el('p',note));a.append(details);
    for(const source of c.sources)a.append(sourceLink(source));return a;
  }
  function download(name,type,text){
    const url=URL.createObjectURL(new Blob([text],{type})),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function render(response,sent){
    $('guide-welcome').hidden=true;
    const user=el('article',undefined,'guide-user');user.append(el('p','Your question','message-label'),el('p',sent));
    const reply=el('article',undefined,'guide-reply'),heading=el('h3',response.heading);heading.tabIndex=-1;reply.append(heading,el('p',response.intro));
    if(response.requirementCount){
      reply.append(el('p',response.relatedCount+' of '+response.requirementCount+' posting lines have related topics. '+response.unrecognizedCount+' have no recognized topic. This is not a fit score.'));
      const rows=el('ol',undefined,'guide-topic-rows');for(const row of response.rows)rows.append(el('li','Posting line '+row.line+': '+(row.topics.length?row.topics.join('; '):'No recognized topic')+'. '+(row.evidenceIds.length?'Related IDs: '+row.evidenceIds.join(', '):'No related evidence selected.')));reply.append(rows);
      if(response.rows.length<response.requirementCount)reply.append(el('p','Showing the first '+response.rows.length+' of '+response.requirementCount+' topic rows. Use the full resume builder for every line.','guide-help'));
    }
    if(response.qualifications.length){
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
    for(const c of response.chunks)reply.append(evidence(c));
    const full=el('a','Open the full resume builder','full-builder-link');full.href='resume.html';reply.append(full,el('p','Rule-based response · Evidence '+response.datasetVersion,'guide-count'));
    log.append(user,reply);heading.focus();counts();status(session.turns>=api.LIMITS.turns?'Eight-turn limit reached. Clear the conversation to start again.':'Answered from approved evidence. '+(api.LIMITS.turns-session.turns)+' turns remain.');
  }
  $('guide-form').addEventListener('submit',event=>{
    event.preventDefault();error('');if(!session)return;
    try{const response=session.send({action,question:question.value,posting:posting.value,profile:profile.value,datasetVersion:data.datasetVersion});invalidateExports();render(response,question.value.trim()||defaults[action]);}
    catch(e){error(e.message);if(action!=='explore_evidence'&&posting.value.trim().length<20){$('posting-context').open=true;posting.focus();}}
  });
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
  window.addEventListener('pageshow',()=>requestAnimationFrame(()=>{if(session){choose(nativeAction(),false,false);clearConversation(false,question.value||posting.value?'Restored inputs and action. Send again to rebuild the response.':'Ready. Choose an example or ask about the work.');}}));
  fetch('career-evidence.v3.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('load');return r.json();}).then(d=>{globalThis.ResumeEngine.validate(d);data=d;session=api.createSession(data);choose(nativeAction(),false,false);counts();status('Ready. Approved evidence '+data.datasetVersion+'. Choose an example or ask about the work.');}).catch(()=>{error('Approved evidence could not load. Reload this page and try again.');status('No answer or export is available until the evidence loads.');});
})();
