import { json, body, supabaseRequest, caseNumber, sendResendEmail, esc } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error:'Method not allowed' });
  try {
    const b = await body(req);
    const name = String(b.name||'').trim();
    const email = String(b.email||'').trim().toLowerCase();
    const merchant = String(b.merchant||'').trim();
    const instruction = String(b.instruction||'').trim().slice(0,10000);
    const outcome = String(b.outcome||'').trim().slice(0,10000);
    const desired = String(b.desired_outcome||'').trim().slice(0,10000);
    if (!name || !email || !merchant || !instruction || !outcome || !desired) return json(res,400,{error:'Please complete every required field.'});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res,400,{error:'Please enter a valid email.'});
    const amount = Math.max(0, Number(b.amount||0));
    const date = String(b.date||'').trim();
    const problem = `Original instruction:\n${instruction}\n\nActual outcome:\n${outcome}${date?`\n\nDate reported: ${date}`:''}`;
    const row = { customer_name:name.slice(0,200), customer_email:email.slice(0,320), merchant:merchant.slice(0,300), amount, currency:'EUR', problem, requested_outcome:desired, status:'new', recovered_amount:0, recovery_fee:0 };
    const data = await supabaseRequest('cases?select=id,customer_name,customer_email,merchant,amount,currency,problem,requested_outcome,status,created_at', { method:'POST', headers:{'Content-Type':'application/json','Prefer':'return=representation'}, body:JSON.stringify(row) });
    const item = Array.isArray(data) ? data[0] : data;
    const id = item?.id;
    const cn = caseNumber(id);
    const owner = process.env.ADMIN_EMAIL || 'Rodrigo.empresarial@gmail.com';
    let emailStatus = 'skipped';
    try {
      const r = await sendResendEmail({ to:owner, subject:`New UNDO case ${cn} — €${amount.toFixed(2)}`, html:`<div style="font-family:Arial,sans-serif"><h2>New UNDO case — ${esc(cn)}</h2><p><b>Customer:</b> ${esc(name)} (${esc(email)})</p><p><b>Merchant:</b> ${esc(merchant)}</p><p><b>Amount:</b> €${amount.toFixed(2)}</p><p><b>Desired outcome:</b> ${esc(desired)}</p><p><b>Problem:</b><br>${esc(problem).replace(/\n/g,'<br>')}</p></div>` });
      emailStatus = r.ok ? 'sent' : 'skipped';
    } catch (e) { console.error('Resend error:', e.message); emailStatus='failed'; }
    return json(res,201,{case_number:cn,status:'new',email_status:emailStatus});
  } catch (e) {
    console.error(e);
    return json(res,500,{error:e.message || 'Could not create case', code:e.status||500});
  }
}
