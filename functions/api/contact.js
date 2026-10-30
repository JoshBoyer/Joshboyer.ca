/** Native Cloudflare contact endpoint. No provider credentials or visitor content are logged. */
import contactServiceModule from '../../lib/contact-service.cjs';
const {createContactService,CONTACT_LIMITS}=contactServiceModule;
let cachedService=null,cachedBinding=null,cachedKey='';
function response(status,body){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
function serviceFor(env){
 const key=[env?.CONTACT_EMAIL_PROVIDER||'',Boolean(env?.RESEND_API_KEY),Boolean(env?.SENDGRID_API_KEY),env?.CONTACT_WEBHOOK_URL||'',env?.MAILCHANNELS_ENABLED||''].join('|');
 if(!cachedService||cachedKey!==key||cachedBinding!==env?.CONTACT_MAILER){cachedService=createContactService({env:env||{}});cachedKey=key;cachedBinding=env?.CONTACT_MAILER;}
 return cachedService;
}
export async function onRequest({request,env}){
 const url = new URL(request.url);
 if (url.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(url.hostname)) return response(403,{ok:false,code:'HTTPS_REQUIRED',error:'Use the secure contact form on joshboyer.ca.'});
 if(request.method.toUpperCase()!=='POST')return response(405,{ok:false,code:'METHOD_NOT_ALLOWED',error:'Method not allowed'});
 const origin=request.headers.get('Origin');
 if(origin&&![new URL(request.url).origin,'https://joshboyer.ca','https://www.joshboyer.ca'].includes(origin))return response(403,{ok:false,code:'ORIGIN_NOT_ALLOWED',error:'Please use the contact form on joshboyer.ca.'});
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return response(415,{ok:false,code:'JSON_REQUIRED',error:'JSON content is required.'});
 const limit=CONTACT_LIMITS.maxRequestBodyBytes;
 if(Number(request.headers.get('Content-Length'))>limit)return response(413,{ok:false,code:'PAYLOAD_TOO_LARGE',error:'Contact request is too large.'});
 let payload, timer, reader, timedOut = false;
 const chunks = []; let size = 0;
 const cancel = () => { try { const pending = reader?.cancel(); pending?.catch(() => {}); } catch {} };
 try {
  reader = request.body?.getReader();
  const read = async () => {
   if (reader) while (true) {
    const {done,value} = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > limit) { cancel(); throw Object.assign(new Error('Payload too large'), {status:413}); }
    chunks.push(value);
   }
   const bytes = new Uint8Array(size); let offset = 0;
   for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
   return JSON.parse(new TextDecoder().decode(bytes));
  };
  const deadline = new Promise((_,reject) => { timer = setTimeout(() => { timedOut = true; chunks.length = 0; reject(new Error('Request read timed out')); cancel(); }, CONTACT_LIMITS.requestReadTimeoutMs); });
  payload = await Promise.race([read(),deadline]);
 } catch (error) {
  if (timedOut) return response(408,{ok:false,code:'REQUEST_TIMEOUT',error:'Contact request timed out. Please try again.'});
  if (error?.status === 413) return response(413,{ok:false,code:'PAYLOAD_TOO_LARGE',error:'Contact request is too large.'});
  return response(400,{ok:false,code:'INVALID_JSON',error:'Invalid JSON request body.'});
 } finally { clearTimeout(timer); }
 const result=await serviceFor(env).handleSubmission({body:payload,clientIp:request.headers.get('CF-Connecting-IP')||'127.0.0.1'});
 return response(result.status,result.body);
}
