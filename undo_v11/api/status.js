import {json, supabaseRequest, caseNumber} from './_lib.js';

function normalize(v=''){return String(v||'').trim().toLowerCase()}

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    let body=req.body;
    if(typeof body==='string') { try{body=JSON.parse(body)}catch{body={}} }
    body=body||{};
    const caseId=String(body.case_id||'').trim();
    const email=normalize(body.email);
    const numericId=caseId.toLowerCase().replace(/^undo-/,'').replace(/^0+/,'')||'0';
    if(!/^\d+$/.test(numericId)||!email) return json(res,400,{error:'Enter your case number and email.'});

    const rows=await supabaseRequest(`cases?id=eq.${encodeURIComponent(numericId)}&select=id,customer_email,merchant,status,amount,recovered_amount,updated_at,created_at`);
    const c=Array.isArray(rows)?rows[0]:rows;
    if(!c || normalize(c.customer_email)!==email) return json(res,404,{error:'We could not find a case matching those details.'});

    const status=String(c.status||'new');
    return json(res,200,{
      ok:true,
      case_number:caseNumber(c.id),
      merchant:c.merchant,
      amount:Number(c.amount||0),
      status,
      recovered_amount:Number(c.recovered_amount||0),
      created_at:c.created_at||null,
      updated_at:c.updated_at||c.created_at||null
    });
  }catch(e){
    console.error(e);
    return json(res,500,{error:'Could not check the case right now.'});
  }
}
