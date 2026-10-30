'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/architect-workbench.js'),'utf8');
const a=source.indexOf('function getExploreBuildDetailCards('),b=source.indexOf('function renderExploreDetailCards(',a);
assert.ok(a>0&&b>a);
const detailCards=new Function(source.slice(a,b)+';return getExploreBuildDetailCards;')();
const disp={overviewCards:[{title:'Overview evidence'}],problem:'Actual problem',contribution:'Actual contribution',solution:'Actual solution',outcome:'Actual outcome',detailType:'Professional',previewStatus:'Implemented',detailDomain:'Insurance',detailTech:'SQL',detailRole:'Analysis'};
test('each project detail tab displays only its distinct source content',()=>{for(const id of ['problem','contribution','solution','outcome']){const cards=detailCards(disp,id);assert.equal(cards.length,1);assert.equal(cards[0].desc,disp[id]);assert.equal(cards[0].active,true);}assert.equal(detailCards(disp,'overview'),disp.overviewCards);assert.equal(detailCards(disp,'unknown'),disp.overviewCards);assert.equal(detailCards(disp,'tech').length,4);});
