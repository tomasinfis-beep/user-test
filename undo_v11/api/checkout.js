import {json,readBody,supabaseRequest,admin,sendEmail,env} from './_lib.js';
export default async function handler(req,res){
  if(!admin(req))return json(res,401,{error:'Unauthorized'});
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const b=await readBody(req);
    if(!b.case_id)return json(res,400,{error:'Missing case_id'});
    const key=env('STRIPE_SECRET_KEY');
    if(!key)return json(res,400,{error:'STRIPE_SECRET_KEY is not configured yet.'});
    const cases=await supabaseRequest(`cases?id=eq.${encodeURIComponent(b.case_id)}&select=*`);
    const c=Array.isArray(cases)?cases[0]:cases;
    if(!c)return json(res,404,{error:'Case not found.'});
    const recovered=Math.max(0,Number(c.recovered_amount||0));
    const pct=Math.max(0,Number(process.env.SUCCESS_FEE_PERCENT||25)||25);
    const fee=Math.round(recovered*pct)/100;
    if(!recovered||!fee)return json(res,400,{error:'No recovered amount recorded.'});
    if(!c.customer_email)return json(res,400,{error:'Customer email is missing.'});

    const base=env('PUBLIC_BASE_URL')||'https://undo-ai.vercel.app';
    const params=new URLSearchParams();
    params.set('mode','payment');
    params.set('success_url',`${base}/?payment=success`);
    params.set('cancel_url',`${base}/?payment=cancelled`);
    params.set('line_items[0][quantity]','1');
    params.set('line_items[0][price_data][currency]','eur');
    params.set('line_items[0][price_data][unit_amount]',String(Math.round(fee*100)));
    params.set('line_items[0][price_data][product_data][name]',`UNDO success fee · ${String(c.case_number||`UNDO-${c.id||''}`)}`);
    params.set('customer_email',c.customer_email);
    const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded'},body:params});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error?.message||'Stripe request failed');

    const caseLabel=String(c.case_number||`UNDO-${c.id||''}`);
    const paymentUrl=j.url;
    const email=await sendEmail({
      to:c.customer_email,
      subject:`UNDO — payment request for ${caseLabel}`,
      html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;line-height:1.6"><p style="font-size:24px;font-weight:700;letter-spacing:-.02em">UNDO</p><h1 style="font-size:30px;letter-spacing:-.03em">Your recovery was successful.</h1><p>We've recovered <strong>€${recovered.toFixed(2)}</strong> for your case <strong>${caseLabel}</strong>.</p><p>As agreed, UNDO's success fee is <strong>€${fee.toFixed(2)}</strong> (25% of the recovered amount).</p><p style="margin:28px 0"><a href="${paymentUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:700">Pay UNDO success fee</a></p><p style="color:#666;font-size:13px">You can review the payment securely through Stripe. If you have any questions, reply to the email you received from UNDO.</p></div>`,
      replyTo:env('ADMIN_EMAIL')||undefined
    });

    return json(res,200,{url:paymentUrl,fee,email_sent:!!email.sent});
  }catch(e){
    console.error(e);
    return json(res,500,{error:e.message||'Checkout failed'});
  }
}
