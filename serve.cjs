'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'dist'),types={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Invalid request');return;}
 if(pathname==='/')pathname='/index.html';else if(['/resume','/career-guide'].includes(pathname))pathname+='.html';
 const filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 fs.stat(filename,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
  const ext=path.extname(filename).toLowerCase(),contentType=types[ext]||'application/octet-stream';
  const baseHeaders={'Content-Type':contentType,'Accept-Ranges':'bytes','Cache-Control':(ext==='.mp4'||ext==='.webm')?'public, max-age=3600':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  const range=req.headers.range;
  if(range){
   const m=/bytes=(\d*)-(\d*)/.exec(range);
   if(!m){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}
   const start=m[1]?parseInt(m[1],10):0,end=m[2]?parseInt(m[2],10):stat.size-1;
   if(isNaN(start)||isNaN(end)||start>end||end>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}
   res.writeHead(206,{...baseHeaders,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});
   if(req.method==='HEAD'){res.end();return;}
   fs.createReadStream(filename,{start,end}).pipe(res);
   return;
  }
  res.writeHead(200,{...baseHeaders,'Content-Length':stat.size});
  if(req.method==='HEAD'){res.end();return;}
  fs.createReadStream(filename).pipe(res);
 });
});
server.listen(4183,'127.0.0.1',()=>process.stdout.write('Local integrated portfolio candidate http://127.0.0.1:4183/\n'));

