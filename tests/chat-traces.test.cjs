'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, createEventValidator, renderAnswer, SCHEMA_VERSION } = require('../chat/contracts/index.cjs');
const corpus = require('../chat/knowledge/corpus.json');
const requestId = '11111111-1111-4111-8111-111111111111';
const generation = '22222222-2222-4222-8222-222222222222';
const provider = (state, elapsedMs, extra = {}) => ({stage:'provider',state,elapsedMs,attempt:1,provider:'openai',model:'gpt-6-luna',...extra});
const frame = (seq, data, event = 'trace') => ({schemaVersion:SCHEMA_VERSION,requestId,generation,seq,event,data});
const validator = () => createEventValidator({requestId,generation,corpus});

test('trace schema accepts bounded public metadata and rejects private/freeform fields', () => {
  assert.equal(validate('traceData', provider('completed', 120, {durationMs:100,inputTokens:2000,outputTokens:80,usageStatus:'known',providerRequestId:'req_example'})).valid, true);
  for (const extra of [{prompt:'secret'}, {headers:{}}, {reasoning:'private'}, {durationMs:-1}, {inputTokens:1.5},
    {providerRequestId:'https://example.com/key'}, {code:'private stack trace'}, {attempt:3}, {model:'unapproved-model'}, {elapsedMs:60001}]) {
    assert.equal(validate('traceData', provider('completed',120,extra)).valid,false);
  }
});

test('trace stage-specific receipts and replay timing are explicit', () => {
  assert.equal(validate('traceData',{stage:'context',state:'completed',elapsedMs:5}).valid,false);
  assert.equal(validate('traceData',{stage:'budget',state:'completed',elapsedMs:5}).valid,false);
  assert.equal(validate('traceData',{stage:'settlement',state:'completed',elapsedMs:null,reservedMicros:100,chargedMicros:50,priceVersion:'v1'}).valid,false);
  assert.equal(validate('traceData',{stage:'settlement',state:'completed',elapsedMs:null,replayed:true,reservedMicros:100,chargedMicros:50,priceVersion:'v1'}).valid,true);
});

test('trace stages require proper transitions and monotonic observed timing', () => {
  const stream = validator();
  assert.throws(()=>stream.accept(frame(1,provider('completed',10))));
  stream.accept(frame(1,provider('started',10)));
  assert.throws(()=>stream.accept(frame(2,provider('started',15))));
  assert.throws(()=>stream.accept(frame(2,provider('completed',9))));
  assert.throws(()=>stream.accept(frame(2,provider('completed',20,{durationMs:21}))));
  assert.throws(()=>stream.accept(frame(2,provider('completed',20,{provider:'anthropic'}))));
  stream.accept(frame(2,provider('completed',20,{durationMs:10})));
  assert.throws(()=>stream.accept(frame(3,provider('failed',25))));
});

test('traces cannot assert excess settlement or follow canonical answers, terminal events or clear', () => {
  const stream = validator();
  assert.throws(()=>stream.accept(frame(1,{stage:'settlement',state:'completed',elapsedMs:20,reservedMicros:100,chargedMicros:101,priceVersion:'v1'})));
  const answer = renderAnswer({schemaVersion:SCHEMA_VERSION,corpusVersion:corpus.corpusVersion,claimIds:[corpus.claims[0].id],noticeCodes:[]},corpus);
  stream.accept(frame(1,answer.blocks[0],'answer_block'));
  assert.throws(()=>stream.accept(frame(2,provider('started',20))));
  const closed = validator(); closed.accept(frame(1,{code:'unavailable',retryable:true},'error'));
  assert.throws(()=>closed.accept(frame(2,provider('started',20))));
  const revoked = validator(); revoked.revoke(); assert.throws(()=>revoked.accept(frame(1,provider('started',20))));
});

test('trace identity is bound to the same request and generation as the answer', () => {
  const stream = validator();
  assert.throws(()=>stream.accept({...frame(1,provider('started',0)),requestId:generation}));
  assert.throws(()=>stream.accept({...frame(1,provider('started',0)),generation:requestId}));
  stream.accept(frame(1,provider('started',0)));
});

test('canonical answer cannot pass while a measured stage remains running', () => {
  const stream = validator();
  stream.accept(frame(1,provider('started',0)));
  const answer = renderAnswer({schemaVersion:SCHEMA_VERSION,corpusVersion:corpus.corpusVersion,claimIds:[corpus.claims[0].id],noticeCodes:[]},corpus);
  assert.throws(()=>stream.accept(frame(2,answer.blocks[0],'answer_block')));
  stream.accept(frame(2,provider('completed',5,{durationMs:5})));
  stream.accept(frame(3,answer.blocks[0],'answer_block'));
});
