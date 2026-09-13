import {json,readBody,supabaseRequest} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const b=await readBody(req);
    const event=String(b.event||'').trim();
    if(!event) return json(res,400,{error:'Missing event'});
    const payload={
      event:event.slice(0,80),
      page:String(b.page||'').slice(0,300),
      source:String(b.source||'').slice(0,120),
      session_id:String(b.session_id||'').slice(0,120),
      referrer:String(b.referrer||'').slice(0,500),
      meta:b.meta&&typeof b.meta==='object'?b.meta:{},
      created_at:new Date().toISOString()
    };
    await supabaseRequest('site_events',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
    return json(res,200,{ok:true});
  }catch(e){
    console.error('Tracking failed:',e);
    return json(res,200,{ok:false});
  }
}
