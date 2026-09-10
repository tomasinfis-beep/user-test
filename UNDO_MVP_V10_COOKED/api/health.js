import { json } from './_lib.js';
export default async function handler(req,res){
  const present=n=>Boolean(process.env[n]?.trim());
  json(res,200,{ok:true,env:{SUPABASE_URL:present('SUPABASE_URL'),SUPABASE_SECRET_KEY:present('SUPABASE_SECRET_KEY')||present('SUPABASE_SERVICE_ROLE_KEY'),RESEND_API_KEY:present('RESEND_API_KEY'),ADMIN_TOKEN:present('ADMIN_TOKEN'),OPENAI_API_KEY:present('OPENAI_API_KEY')}});
}
