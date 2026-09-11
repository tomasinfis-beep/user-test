import {json,readBody,env,supabaseRequest,admin} from './_lib.js';
export default async function handler(req,res){
  if(!admin(req)) return json(res,401,{error:'Unauthorized'});
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const b=await readBody(req);
    if(!b.case_id) return json(res,400,{error:'Missing case_id'});
    const key=env('STRIPE_SECRET_KEY');
    if(!key) return json(res,400,{error:'STRIPE_SECRET_KEY is not configured yet.'});
    const rows=await supabaseRequest(`cases?id=eq.${encodeURIComponent(b.case_id)}&select=*`);
    const c=Array.isArray(rows)?rows[0]:rows;
    if(!c) return json(res,404,{error:'Case not found'});
    const recovered=Math.max(0,Number(c.recovered_amount||0));
    const pct=Math.max(0,Number(env('SUCCESS_FEE_PERCENT')||25)||25);
    const fee=Math.round(recovered*pct)/100;
    if(!recovered||!fee) return json(res,400,{error:'Enter the recovered amount first.'});
    const base=env('PUBLIC_BASE_URL')||'https://undo-ai.vercel.app';
    const params=new URLSearchParams();
    params.set('mode','payment');
    params.set('success_url',`${base}/?payment=success&case=${encodeURIComponent(String(b.case_id))}`);
    params.set('cancel_url',`${base}/?payment=cancelled&case=${encodeURIComponent(String(b.case_id))}`);
    params.set('line_items[0][quantity]','1');
    params.set('line_items[0][price_data][currency]','eur');
    params.set('line_items[0][price_data][unit_amount]',String(Math.round(fee*100)));
    params.set('line_items[0][price_data][product_data][name]','UNDO success fee');
    params.set('line_items[0][price_data][product_data][description]',`Case ${String(b.case_id)}`);
    params.set('customer_email',String(c.customer_email||''));
    const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded'},body:params});
    const j=await r.json();
    if(!r.ok) throw new Error(j.error?.message||'Stripe checkout failed');
    return json(res,200,{url:j.url,fee});
  }catch(e){
    console.error(e);
    return json(res,500,{error:e.message||'Payment failed'});
  }
}
