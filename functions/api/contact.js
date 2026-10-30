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
 if(request.method.toUpperCase()!=='POST')return response(405,{ok:false,code:'METHOD_NOT_ALLOWED',error:'Method not allowed'});
 const origin=request.headers.get('Origin');
 if(origin&&![new URL(request.url).origin,'https://joshboyer.ca','https://www.joshboyer.ca'].includes(origin))return response(403,{ok:false,code:'ORIGIN_NOT_ALLOWED',error:'Please use the contact form on joshboyer.ca.'});
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return response(415,{ok:false,code:'JSON_REQUIRED',error:'JSON content is required.'});
 const limit=CONTACT_LIMITS.maxRequestBodyBytes;
 if(Number(request.headers.get('Content-Length'))>limit)return response(413,{ok:false,code:'PAYLOAD_TOO_LARGE',error:'Contact request is too large.'});
 let payload;
 try{
  const reader=request.body?.getReader(),chunks=[];let size=0;
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return response(413,{ok:false,code:'PAYLOAD_TOO_LARGE',error:'Contact request is too large.'});}chunks.push(value);}}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  payload=JSON.parse(new TextDecoder().decode(bytes));
 }catch{return response(400,{ok:false,code:'INVALID_JSON',error:'Invalid JSON request body.'});}
 const result=await serviceFor(env).handleSubmission({body:payload,clientIp:request.headers.get('CF-Connecting-IP')||'127.0.0.1'});
 return response(result.status,result.body);
}
