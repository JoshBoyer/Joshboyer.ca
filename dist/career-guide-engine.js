/* Finite, browser-local career workflow. No inference, tools, storage or network. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./resume-engine.js'):root.ResumeEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.CareerGuide=api;})(globalThis,function(engine){
  'use strict';
  const VERSION='guide-1',ACTIONS=Object.freeze(['explore_evidence','compare_job','prepare_resume']);
  const LIMITS=Object.freeze({question:1000,posting:12000,turns:8,response:16000});
  function dispatch(data,request){
    engine.validate(data);
    const fields=['action','question','posting','profile','datasetVersion'];
    if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).some(k=>!fields.includes(k)))throw Error('Use one of the three career-guide actions.');
    if(!ACTIONS.includes(request.action))throw Error('Choose Explore evidence, Compare a posting or Prepare a resume.');
    if(request.datasetVersion!==data.datasetVersion)throw Error('The evidence version changed. Reload the guide.');
    if(typeof request.question!=='string'||request.question.length>LIMITS.question)throw Error('Use at most 1,000 question characters. Shorten the question and try again.');
    if(typeof request.posting!=='string'||request.posting.length>LIMITS.posting)throw Error('Use at most 12,000 posting characters. Shorten the posting and try again.');
    if(request.profile!=='auto'&&!data.profiles.some(p=>p.id===request.profile))throw Error('Choose an available emphasis.');
    const q=request.question.trim();let response;
    const chunk=id=>{
      const c=data.chunks.find(c=>c.id===id&&c.active!==false);if(!c)throw Error('An evidence item is unavailable.');
      const role=data.roles.find(r=>r.id===c.roleId);
      return {id:c.id,title:c.title,employer:role.employer,role:role.title,period:c.period,text:c.resumeText,decision:c.decision,process:c.process,guidance:c.technicalGuidance,outcome:c.outcome,limits:c.qualificationNotes,sources:c.sourceRefs.map(id=>{const s=data.sources.find(s=>s.id===id);return{id:s.id,path:s.path};})};
    };
    const quals=ids=>ids.map(id=>{const x=data.qualificationCatalog.find(q=>q.id===id&&q.active!==false);return{id:x.id,label:x.label,note:x.note};});
    if(request.action==='explore_evidence'){
      if(q.length<3)throw Error('Ask at least three characters about Josh’s work, or choose an example.');
      if(/^(overview|who is josh\??|tell me about josh\.?|what is josh'?s background\??)$/i.test(q))response={kind:'overview',heading:'Josh’s professional background',intro:data.person.summary,chunks:['experience-headquarters','experience-provider-sync-review','experience-continuity'].map(chunk),qualifications:[]};
      else{
        const result=engine.build(data,q.length<20?q+' career evidence request':q,request.profile);
        const named=data.chunks.filter(c=>c.active!==false&&c.projectId&&engine.contains(q,c.projectId.replaceAll('-',' '))).map(c=>c.id);
        const related=[...new Set([...named,...result.ranked.map(r=>r.id)])];
        response=related.length||result.qualificationIds.length?{kind:'evidence',heading:'Related career evidence',intro:'These are topic matches from approved text, not a generated answer or a complete qualification assessment.',chunks:related.slice(0,3).map(chunk),qualifications:quals(result.qualificationIds)}:{kind:'redirect',heading:'Keep the question about the work',intro:'I can explore Josh’s approved career evidence, compare a public job posting or prepare a resume. Try insurance integrations, infrastructure, solution design, SQL, or NEXUS.',chunks:[],qualifications:[]};
      }
    }else{
      const result=engine.build(data,request.posting,request.profile);
      response={kind:request.action==='compare_job'?'fit':'resume',heading:request.action==='compare_job'?'Posting topics and evidence':'A resume from approved evidence',intro:'Related topics help locate evidence. They do not establish complete fit, required years, seniority, credentials or eligibility.',chunks:result.ranked.slice(0,3).map(r=>chunk(r.id)),qualifications:quals(result.qualificationIds),requirementCount:result.requirements.length,relatedCount:result.requirements.filter(r=>r.evidenceIds.length).length,unrecognizedCount:result.unrecognizedRequirementIds.length,rows:result.requirements.slice(0,8).map((r,i)=>({line:i+1,topics:r.facets.map(id=>data.facets.find(f=>f.id===id).label),evidenceIds:r.evidenceIds})),selectedIds:result.selectedIds};
      if(request.action==='prepare_resume'){
        if(!result.selectedIds.length){response.kind='no_resume';response.heading='No related evidence selected';response.intro='No active approved evidence matches the posting topics. I cannot prepare a supported resume from this posting. Try a more relevant posting or explore the work.';}
        else{const resume=engine.compose(data,result);response.resumeText=engine.toText(resume);response.selection={guideVersion:VERSION,datasetVersion:data.datasetVersion,rankingVersion:result.rankingVersion,templateVersion:result.templateVersion,profileId:result.profileId,selectedIds:resume.selectedIds,sourceRefs:resume.sourceRefs,qualificationsToConfirm:result.qualificationIds,note:'Approved evidence only. Posting and question text excluded.'};}
      }
    }
    response.version=VERSION;response.datasetVersion=data.datasetVersion;
    if(JSON.stringify(response).length>LIMITS.response)throw Error('This response exceeds the demo limit. Use the full resume builder for a detailed review.');
    return response;
  }
  function createSession(data){let turns=0;return Object.freeze({send(request){if(turns>=LIMITS.turns)throw Error('This conversation has reached eight turns. Clear the conversation to start again.');const r=dispatch(data,request);turns++;return r;},clear(){turns=0;},get turns(){return turns;}});}
  return Object.freeze({VERSION,ACTIONS,LIMITS,dispatch,createSession});
});
