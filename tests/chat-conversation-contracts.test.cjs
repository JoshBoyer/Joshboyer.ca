'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, renderAnswer, createEventValidator, SCHEMA_VERSION } = require('../chat/contracts/index.cjs');
const corpus = require('../chat/knowledge/corpus.json');
const requestId = '11111111-1111-4111-8111-111111111111';
const generation = '22222222-2222-4222-8222-222222222222';
const reply = (extra={}) => ({kind:'general',text:'A queue keeps work ready until a worker can process it.',suggestions:['Would an example help?'],...extra});
const selection = (extra={}) => ({schemaVersion:SCHEMA_VERSION,corpusVersion:corpus.corpusVersion,...reply(),claimIds:[],noticeCodes:[],...extra});
const frame = (seq,event,data) => ({schemaVersion:SCHEMA_VERSION,requestId,generation,seq,event,data});

test('general conversation is distinct from canonical portfolio evidence', () => {
  assert.equal(validate('conversationSelection',selection()).valid,true);
  assert.equal(validate('conversationSelection',selection({kind:'portfolio'})).valid,false);
  assert.equal(validate('conversationSelection',selection({kind:'portfolio',noticeCodes:['unsupported_evidence']})).valid,true);
  const evidence=renderAnswer({schemaVersion:SCHEMA_VERSION,corpusVersion:corpus.corpusVersion,claimIds:[],noticeCodes:['general_knowledge']},corpus);
  assert.equal(evidence.sources.length,0);
  assert.match(evidence.blocks[0].text,/No live sources/);
});

test('conversation shape rejects extra authority and bounds text and suggested follow-ups by bytes', () => {
  for (const extra of [{apiKey:'secret'},{model:'override'},{sourceUrls:['https://evil.test']},{toolCalls:[]},{reasoning:'hidden'}]) {
    assert.equal(validate('conversationSelection',selection(extra)).valid,false);
  }
  assert.equal(validate('conversationData',reply({text:'🦫'.repeat(1500)})).valid,true);
  assert.equal(validate('conversationData',reply({text:'🦫'.repeat(1501)})).valid,false);
  assert.equal(validate('conversationData',reply({suggestions:['🦫'.repeat(51)]})).valid,false);
  assert.equal(validate('conversationData',reply({suggestions:['a','a']})).valid,false);
  assert.equal(validate('conversationData',reply({suggestions:['a','b','c','d']})).valid,false);
  assert.equal(validate('streamEvent',frame(1,'conversation',reply({text:'🦫'.repeat(1501)}))).valid,false);
});

test('conversation precedes evidence but only follows completed stages and appears once', () => {
  const stream=createEventValidator({requestId,generation,corpus});
  stream.accept(frame(1,'trace',{stage:'provider',state:'started',attempt:1,provider:'openai',model:'gpt-6-luna',elapsedMs:0}));
  assert.throws(()=>stream.accept(frame(2,'conversation',reply())));
  stream.accept(frame(2,'trace',{stage:'provider',state:'completed',attempt:1,provider:'openai',model:'gpt-6-luna',elapsedMs:100}));
  stream.accept(frame(3,'conversation',reply()));
  assert.throws(()=>stream.accept(frame(4,'conversation',reply())));
  assert.throws(()=>stream.accept(frame(4,'status',{code:'thinking'})));
  const evidence=renderAnswer({schemaVersion:SCHEMA_VERSION,corpusVersion:corpus.corpusVersion,claimIds:[],noticeCodes:['general_knowledge']},corpus);
  stream.accept(frame(4,'answer_block',evidence.blocks[0]));
  stream.accept(frame(5,'sources',{corpusVersion:corpus.corpusVersion,sources:[]}));
  stream.accept(frame(6,'done',{outcome:'completed'}));
  assert.throws(()=>stream.accept(frame(7,'conversation',reply())));
});

test('conversation waits for routing, retrieval and repeatable mcp stages to complete before emission', () => {
  const pendingRouting = createEventValidator({requestId,generation,corpus});
  pendingRouting.accept(frame(1,'trace',{stage:'routing',state:'started',elapsedMs:1}));
  assert.throws(()=>pendingRouting.accept(frame(2,'conversation',reply())));

  const pendingRetrieval = createEventValidator({requestId,generation,corpus});
  pendingRetrieval.accept(frame(1,'trace',{stage:'retrieval',state:'started',elapsedMs:1}));
  assert.throws(()=>pendingRetrieval.accept(frame(2,'conversation',reply())));

  const pendingMcp = createEventValidator({requestId,generation,corpus});
  pendingMcp.accept(frame(1,'trace',{stage:'mcp',state:'started',elapsedMs:1,mcpMethod:'tools/call',toolCallId:'tool-1',toolName:'get_case_study'}));
  assert.throws(()=>pendingMcp.accept(frame(2,'conversation',reply())));

  const fullConversation = createEventValidator({requestId,generation,corpus});
  fullConversation.accept(frame(1,'trace',{stage:'routing',state:'completed',elapsedMs:2,routingMode:'portfolio_mcp',needsRetrieval:true,requestedTools:['get_case_study']}));
  fullConversation.accept(frame(2,'trace',{stage:'retrieval',state:'completed',elapsedMs:15,retrievalMode:'hybrid',matchedCount:2,corpusVersion:corpus.corpusVersion}));
  fullConversation.accept(frame(3,'trace',{stage:'mcp',state:'started',elapsedMs:16,mcpMethod:'tools/call',toolCallId:'tool-1',toolName:'get_case_study'}));
  fullConversation.accept(frame(4,'trace',{stage:'mcp',state:'completed',elapsedMs:30,durationMs:14,mcpMethod:'tools/call',toolCallId:'tool-1',toolName:'get_case_study',toolOutcome:'completed'}));
  fullConversation.accept(frame(5,'trace',{stage:'provider',state:'started',attempt:1,provider:'openai',model:'gpt-6-luna',elapsedMs:31}));
  fullConversation.accept(frame(6,'trace',{stage:'provider',state:'completed',attempt:1,provider:'openai',model:'gpt-6-luna',elapsedMs:90,durationMs:59}));
  fullConversation.accept(frame(7,'conversation',reply({kind:'portfolio',text:'NEXUS is an independent multi-agent capstone project.'})));
  const evidence=renderAnswer({schemaVersion:SCHEMA_VERSION,corpusVersion:corpus.corpusVersion,claimIds:[corpus.claims[0].id],noticeCodes:[]},corpus);
  fullConversation.accept(frame(8,'answer_block',evidence.blocks[0]));
  fullConversation.accept(frame(9,'sources',{corpusVersion:corpus.corpusVersion,sources:evidence.sources}));
  fullConversation.accept(frame(10,'done',{outcome:'completed'}));
});

test('conversation rejects NUL bytes, multi-line suggestions and hostile objects without leaking canaries', () => {
  const canary = 'CANARY-CONV-7712b9a';
  assert.equal(validate('conversationData',reply({text:`Valid start\u0000${canary}`})).valid,false);
  assert.equal(validate('conversationData',reply({text:'\u0000'})).valid,false);
  assert.equal(validate('conversationData',reply({suggestions:[`Line1\r\n${canary}`]})).valid,false);
  assert.equal(validate('conversationData',reply({suggestions:[`Line1\n${canary}`]})).valid,false);
  assert.equal(validate('conversationData',reply({suggestions:[`Line1\u2028${canary}`]})).valid,false);
  assert.equal(validate('conversationSelection',selection({text:`Hello\u0000${canary}`})).valid,false);

  const hostile = Object.defineProperty(reply(), 'text', {
    enumerable: true,
    get() { throw new Error(canary); }
  });
  const res = validate('conversationData', hostile);
  assert.equal(res.valid, false);
  assert.doesNotMatch(JSON.stringify(res), new RegExp(canary));
});
