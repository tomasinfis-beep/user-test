export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 250000) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

export function env(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

export function requireEnv(names) {
  for (const name of names) {
    const v = env(name);
    if (v) return v;
  }
  throw new Error(`Missing environment variable: ${names.join(' or ')}`);
}

export function requireAdmin(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const expected = env('ADMIN_TOKEN');
  if (!expected || token !== expected) {
    json(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function caseNumber(id) {
  return `UNDO-${String(id).padStart(6, '0')}`;
}

export function supabaseHeaders(key, extra={}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export async function supabaseRequest(path, options={}) {
  const url = requireEnv(['SUPABASE_URL']).replace(/\/$/, '') + `/rest/v1/${path}`;
  const key = requireEnv(['SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY']);
  const res = await fetch(url, { ...options, headers: supabaseHeaders(key, options.headers || {}) });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data?.message || data?.hint || data?.error || `Supabase HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; err.details = data; throw err;
  }
  return data;
}

export async function sendResendEmail({to, subject, html}) {
  const key = env('RESEND_API_KEY');
  if (!key) return { ok:false, skipped:true, reason:'RESEND_API_KEY missing' };
  const from = env('EMAIL_FROM') || 'UNDO <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body:JSON.stringify({ from, to:[to], subject, html })
  });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
  if (!r.ok) { const e = new Error(data?.message || `Resend HTTP ${r.status}`); e.details=data; throw e; }
  return { ok:true, id:data?.id || null };
}

export function esc(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
