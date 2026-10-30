import previous, {byteRange, mediaSlice} from './legacy/worker.js';
import {onRequest as contact} from './functions/api/contact.js';
import files from './public-manifest.json';
export {PortfolioState} from './legacy/worker.js';
const allowed=new Map(files.map(file=>[file.path,file.size]));
function secured(response,api=false){const result=new Response(response.body,response);result.headers.set('X-Content-Type-Options','nosniff');result.headers.set('Referrer-Policy','strict-origin-when-cross-origin');result.headers.set('X-Frame-Options','DENY');if(api)result.headers.set('Cache-Control','no-store');return result;}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);let pathname;
 try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
 // eslint-disable-next-line no-control-regex -- Intentional rejection or removal of control characters.
 if(/[\\\u0000-\u001f%:]/.test(pathname)||pathname.split('/').some(p=>p.startsWith('.')))return new Response('Forbidden',{status:403});
 const context={request,env,waitUntil:ctx.waitUntil.bind(ctx),passThroughOnException:ctx.passThroughOnException.bind(ctx)};
 try{
  if(pathname==='/api/contact'||pathname==='/api/contact/')return secured(await contact(context),true);
  if(/^\/api\/(?:twin(?:\/|$)|explore(?:\/|$)|config\/?$)/i.test(pathname))return secured(new Response(JSON.stringify({ok:false,enabled:false,available:false,error:{code:'TWIN_REMOVED',message:'The digital twin and its AI access have been removed.'}}),{status:410,headers:{'Content-Type':'application/json'}}),true);
  if(/^\/(?:twin-(?:drawer|voice)\.(?:js|css)|josh-3d-avatar\.(?:js|css)|twin-context\.json|career-guide-ui\.js)$/i.test(pathname))return secured(new Response('Digital twin removed',{status:410}),true);
  if(pathname.startsWith('/api/'))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  if(pathname==='/'||/^\/(?:home|stories|story|projects|project|about|explore|contact|thinking|privacy)(?:\/[a-z0-9-]+)?\/?$/i.test(pathname))pathname='/index.html';
  if(!allowed.has(pathname))return new Response('Not found',{status:404});
  const assetURL=new URL(request.url);assetURL.pathname=pathname;
  const media=/\.(?:mp4|webm)$/i.test(pathname),assetHeaders=new Headers(request.headers);
  if(media)assetHeaders.set('Accept-Encoding','identity');
  const asset=await env.ASSETS.fetch(new Request(assetURL,new Request(request,{headers:assetHeaders})));
  let result=asset;
  if(media){
   const size=allowed.get(pathname);
   if(request.method==='GET'&&request.headers.has('Range')&&!request.headers.has('If-Range')&&asset.status===200){
    const range=byteRange(request.headers.get('Range'),size);
    if(!range){asset.body?.cancel().catch(()=>{});result=new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size,'Content-Length':'0'}});}
    else{const headers=new Headers(asset.headers);headers.delete('Content-Encoding');headers.set('Content-Range','bytes '+range.start+'-'+range.end+'/'+size);headers.set('Content-Length',String(range.end-range.start+1));result=new Response(mediaSlice(asset.body,range.start,range.end),{status:206,headers});}
   }
   const response=new Response(result.body,result);response.headers.set('Accept-Ranges','bytes');if(response.status===200)response.headers.set('Content-Length',String(size));result=response;
  }
  return secured(result);
 }catch(error){return new Response(JSON.stringify({ok:false,error:'Service temporarily unavailable'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
}};
