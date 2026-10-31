import previous, {byteRange, mediaSlice} from './legacy/worker.js';
import {onRequest as contact} from './functions/api/contact.js';
import files from './public-manifest.json';
export {PortfolioState} from './legacy/worker.js';
const allowed=new Map(files.map(file=>[file.path,file.size]));
const PUBLIC_HOSTS = new Set(['joshboyer.ca', 'www.joshboyer.ca']);
const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' https://cloudflareinsights.com; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; frame-src 'none'";
function secured(response, api = false, url) {
 const result = new Response(response.body, response);
 result.headers.set('X-Content-Type-Options', 'nosniff');
 result.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
 result.headers.set('X-Frame-Options', 'DENY');
 if (api) result.headers.set('Cache-Control', 'no-store');
 if (url?.protocol === 'https:' && PUBLIC_HOSTS.has(url.hostname)) result.headers.set('Strict-Transport-Security', 'max-age=86400');
 if (/^text\/html(?:;|$)/i.test(result.headers.get('Content-Type') || '')) result.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
 return result;
}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);let pathname;
 const secure = (response, api = false) => secured(response, api, url);
 try{pathname=decodeURIComponent(url.pathname);}catch{return secure(new Response('Bad request',{status:400}));}
 // eslint-disable-next-line no-control-regex -- Intentional rejection or removal of control characters.
 if(/[\\\u0000-\u001f%:]/.test(pathname)||pathname.split('/').some(p=>p.startsWith('.')))return secure(new Response('Forbidden',{status:403}));
 // Enforce transport before reading request bodies or dispatching any service.
 if (url.protocol !== 'https:' && PUBLIC_HOSTS.has(url.hostname)) {
  if (pathname === '/api/contact' || pathname === '/api/contact/') return secure(new Response(JSON.stringify({ok:false,code:'HTTPS_REQUIRED',error:'Use the secure contact form on joshboyer.ca.'}), {status:403,headers:{'Content-Type':'application/json'}}), true);
  const destination = new URL(url); destination.protocol = 'https:'; destination.port = '';
  return secure(new Response(null, {status:308,headers:{Location:destination.href}}));
 }
 const context={request,env,waitUntil:ctx.waitUntil.bind(ctx),passThroughOnException:ctx.passThroughOnException.bind(ctx)};
 try{
  if(pathname==='/api/contact'||pathname==='/api/contact/')return secure(await contact(context),true);
  if(/^\/api\/chat(?:\/|$)/i.test(pathname))return secure(new Response(JSON.stringify({schemaVersion:'1.0.0',error:{code:'unavailable',retryable:false}}),{status:404,headers:{'Content-Type':'application/json'}}),true);
  if(/^\/api\/(?:twin(?:\/|$)|explore(?:\/|$)|config\/?$)/i.test(pathname))return secure(new Response(JSON.stringify({ok:false,enabled:false,available:false,error:{code:'TWIN_REMOVED',message:'The digital twin and its AI access have been removed.'}}),{status:410,headers:{'Content-Type':'application/json'}}),true);
  if(/^\/(?:twin-(?:drawer|voice)\.(?:js|css)|josh-3d-avatar\.(?:js|css)|twin-context\.json|career-guide-ui\.js)$/i.test(pathname))return secure(new Response('Digital twin removed',{status:410}),true);
  if(/^\/chat-preview(?:\.html)?\/?$/i.test(pathname))return secure(new Response('Not found',{status:404}),true);
  if(/^\/api\/calendar\/(?:review|confirm)\/?$/i.test(pathname))return secure(await previous.fetch(request,env,ctx),true);
  if(/^\/api(?:\/|$)/i.test(pathname))return secure(new Response(JSON.stringify({schemaVersion:'1.0.0',error:{code:'unavailable',retryable:false}}),{status:404,headers:{'Content-Type':'application/json'}}),true);
  if(!['GET','HEAD'].includes(request.method))return secure(new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}}));
  if(pathname==='/'||/^\/(?:home|stories|story|projects|project|about|explore|contact|thinking|privacy)(?:\/[a-z0-9-]+)?\/?$/i.test(pathname))pathname='/index.html';
  if(!Object.prototype.hasOwnProperty.call(Object.fromEntries(allowed),pathname)||!allowed.has(pathname))return secure(new Response('Not found',{status:404}),true);
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
  return secure(result);
 }catch(error){return secure(new Response(JSON.stringify({ok:false,error:'Service temporarily unavailable'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}),true);}
}};
