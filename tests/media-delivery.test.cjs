'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const root=path.resolve(__dirname,'..'),specs=require('./fixtures/optimized-media.json');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function webpSize(b){assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');for(let o=12;o+8<b.length;){const type=b.toString('ascii',o,o+4),n=b.readUInt32LE(o+4),d=o+8;if(type==='VP8X')return{width:b.readUIntLE(d+4,3)+1,height:b.readUIntLE(d+7,3)+1};if(type==='VP8 ')return{width:b.readUInt16LE(d+6)&16383,height:b.readUInt16LE(d+8)&16383};if(type==='VP8L'){const v=b.readUInt32LE(d+1);return{width:(v&16383)+1,height:((v>>>14)&16383)+1};}o=d+n+(n%2);}throw new Error('Missing WebP dimensions');}
test('reviewed optimized assets retain their source identity and expected encoded dimensions',()=>{
 for(const s of specs){const original=fs.readFileSync(path.join(root,'dist',s.source)),optimized=fs.readFileSync(path.join(root,'dist',s.output));assert.equal(sha(original),s.sourceSha256,s.source+' original preserved');assert.equal(sha(optimized),s.sha256,s.output+' approved derivative');assert.equal(optimized.length,s.bytes);assert.deepEqual(webpSize(optimized),{width:s.width,height:s.height});assert.ok(optimized.length<original.length,s.output+' must reduce bytes');}
});
test('optimized image responses use WebP MIME and exact safe byte ranges',async()=>{
 const {server}=require('../serve.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,s=specs.find(x=>x.output.includes('mobile-1080'));
 const request=headers=>new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path:'/'+s.output,headers:{Connection:'close',...headers}},res=>{const a=[];res.on('data',b=>a.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(a)}));}).on('error',reject);});
 try{const full=await request({}),part=await request({Range:'bytes=0-31'}),bad=await request({Range:'bytes='+s.bytes+'-'});assert.equal(full.status,200);assert.equal(full.headers['content-type'],'image/webp');assert.equal(sha(full.body),s.sha256);assert.equal(part.status,206);assert.deepEqual(part.body,full.body.subarray(0,32));assert.equal(bad.status,416);}finally{await new Promise(r=>server.close(r));}
});
