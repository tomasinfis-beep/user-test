import { json, body, supabaseRequest, caseNumber, requireAdmin } from './_lib.js';

export default async function handler(req,res){
  if(!requireAdmin(req,res)) return;
  try{
    if(req.method==='GET'){
      const data = await supabaseRequest('cases?select=*&order=created_at.desc&limit=200');
      return json(res,200,{cases:(data||[]).map(x=>({...x,case_number:caseNumber(x.id)}))});
    }
    if(req.method==='PATCH'){
      const b=await body(req); if(!b.id) return json(res,400,{error:'Missing id'});
      const patch={updated_at:new Date().toISOString()};
      if(b.status) patch.status = b.status==='New'?'new':b.status;
      if(b.recovered_amount!==undefined){const n=Math.max(0,Number(b.recovered_amount));patch.recovered_amount=n;patch.recovery_fee=Math.round(n*Number(process.env.SUCCESS_FEE_PERCENT||25))/100;}
      const data=await supabaseRequest(`cases?id=eq.${encodeURIComponent(b.id)}&select=*`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(patch)});
      const item=Array.isArray(data)?data[0]:data; return json(res,200,{case:{...item,case_number:caseNumber(item.id)}});
    }
    return json(res,405,{error:'Method not allowed'});
  }catch(e){console.error(e);return json(res,500,{error:e.message||'Admin operation failed'});}
}
