import { json, body, supabaseRequest, requireAdmin } from './_lib.js';

function localAnalysis(c){
  const amount=Number(c.amount||0); const p=(c.problem||'').toLowerCase(); const d=(c.requested_outcome||'').toLowerCase();
  const signals=[];
  if(/wrong|incorrect|duplicate|cancel|unwanted/.test(p)) signals.push('clear transaction discrepancy or cancellation issue');
  if(/refund|return|cancel|replacement|correct/.test(d)) signals.push('requested outcome is operationally specific');
  const severity = amount>=500?'high':amount>=100?'medium':'low';
  const recoverability = signals.length>=2?'high':signals.length===1?'medium':'unclear';
  return { severity, recoverability, confidence:0.58, discrepancy:'The customer reports a mismatch between the requested AI action and the actual outcome; verify against order/booking records.', recommended_route:'Collect the original instruction and transaction evidence, then use the merchant’s official cancellation/return/refund route first.', evidence_needed:['Original AI instruction or screenshot','Order/booking confirmation','Merchant policy or return/cancellation terms','Relevant transaction date'], next_actions:['Verify what the customer authorized','Verify what the agent actually did','Check the applicable merchant deadline','Prepare a factual recovery request','Escalate only if the normal recovery route fails'], risks:['Do not claim a refund is guaranteed','Do not misrepresent what the AI or customer authorized','Do not share passwords or full payment details'], customer_message:'We have enough information to begin reviewing the case. We will verify the transaction and identify the most appropriate legitimate recovery route before any consequential action.', research_queries:[`${c.merchant} refund return cancellation policy`,`${c.merchant} AI agent purchase cancellation`], note:'Local triage used because OPENAI_API_KEY is not configured.'};
}

export default async function handler(req,res){
 if(!requireAdmin(req,res))return;
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 try{
  const b=await body(req); if(!b.case_id)return json(res,400,{error:'Missing case_id'});
  const data=await supabaseRequest(`cases?id=eq.${encodeURIComponent(b.case_id)}&select=*&limit=1`); const c=Array.isArray(data)?data[0]:data; if(!c)return json(res,404,{error:'Case not found'});
  let analysis=null;
  const key=process.env.OPENAI_API_KEY?.trim();
  if(key){
    const prompt=`You are UNDO's cautious case analyst. Analyze this customer report about an AI agent mistake. Do not invent facts, legal rights, merchant policies, refunds, or guarantees. Return JSON with severity (low|medium|high), recoverability (low|medium|high|unclear), confidence (0-1), discrepancy, recommended_route, evidence_needed (array), next_actions (array), risks (array), customer_message, research_queries (array). Case: Merchant: ${c.merchant}; Amount: €${c.amount}; Problem: ${c.problem}; Desired outcome: ${c.requested_outcome}`;
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5',input:prompt} )});
    const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||'OpenAI request failed');
    const text=j.output_text||j.output?.map(x=>x.content?.map(y=>y.text||'').join('')).join('')||''; analysis=JSON.parse(text.replace(/^```json|```$/g,'').trim());
  } else { analysis=localAnalysis(c); }
  const updated=await supabaseRequest(`cases?id=eq.${encodeURIComponent(b.case_id)}&select=*`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({ai_analysis:analysis,status:'Investigating',updated_at:new Date().toISOString()})});
  return json(res,200,{analysis,case:Array.isArray(updated)?updated[0]:updated});
 }catch(e){console.error(e);return json(res,500,{error:e.message||'Analysis failed'});}
}
