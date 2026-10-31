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
