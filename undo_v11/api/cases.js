import {json,readBody,supabaseRequest,caseNumber,sendEmail,env,esc} from './_lib.js';

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const b=await readBody(req);
    const payload={
      customer_name:String(b.customer_name||'').trim(),
      customer_email:String(b.customer_email||'').trim().toLowerCase(),
      merchant:String(b.merchant||'').trim(),
      amount:Math.max(0,Number(b.amount||0)||0),
      currency:'EUR',
      problem:String(b.problem||'').trim(),
      requested_outcome:String(b.requested_outcome||'').trim(),
      status:'new',
      recovered_amount:0,
      recovery_fee:0
    };
    if(!payload.customer_name||!payload.customer_email||!payload.merchant||!payload.problem||!payload.requested_outcome) return json(res,400,{error:'Missing required case information.'});
    if(payload.customer_email.length>200||payload.customer_name.length>120||payload.merchant.length>160||payload.problem.length>12000||payload.requested_outcome.length>3000) return json(res,400,{error:'One or more fields are too long.'});
    const rows=await supabaseRequest('cases',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    const item=Array.isArray(rows)?rows[0]:rows;
    const case_number=caseNumber(item?.id);
    let email={sent:false};
    try{
      const to=env('ADMIN_EMAIL')||'Rodrigo.empresarial@gmail.com';
      const subject=`New UNDO case ${case_number} · €${payload.amount.toFixed(2)}`;
      const html=`<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto"><div style="padding:18px 0;border-bottom:1px solid #ddd"><strong>UNDO</strong></div><h2>New case ${esc(case_number)}</h2><p><b>Customer:</b> ${esc(payload.customer_name)} (${esc(payload.customer_email)})</p><p><b>Merchant:</b> ${esc(payload.merchant)}</p><p><b>Amount:</b> €${payload.amount.toFixed(2)}</p><p><b>Desired outcome:</b> ${esc(payload.requested_outcome)}</p><p><b>Details:</b><br>${esc(payload.problem).replace(/\n/g,'<br>')}</p></div>`;
      email=await sendEmail({to,subject,html,replyTo:payload.customer_email});
    }catch(e){console.error('Notification failed:',e)}
    return json(res,200,{ok:true,case_number,id:item?.id||null,email});
  }catch(e){console.error(e);return json(res,500,{error:e.message||'Case submission failed'})}
}
