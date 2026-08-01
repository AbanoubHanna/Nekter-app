// NEKTER — admin-create-user
//
// Lets an existing "مدير عام" invite a new admin (email only) directly
// from the /admin panel, instead of opening the Supabase Dashboard.
//
// The service_role key needed to create a Supabase Auth user is read
// from an environment variable INSIDE this server-side function only —
// it is never sent to, or reachable from, the browser bundle.
//
// Flow: caller's own JWT is used first to verify they are a logged-in
// "مدير عام" (checked against admin_profiles). Only then does the
// function switch to a service_role client to send the invite. The
// invited person still has to accept the email, set a password, and
// log into /admin once — at which point rpc_ensure_admin_profile()
// (already in migration-2-new-features.sql) creates their admin_profiles
// row as "مشرف", exactly like the manual Dashboard flow always worked.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'يجب تسجيل الدخول' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Scoped to the caller's own session — only used to find out who they are.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return json({ error: 'جلسة غير صالحة' }, 401);

  const { data: profile, error: profileError } = await callerClient
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'مدير عام') {
    return json({ error: 'الصلاحية دي لمدير عام بس' }, 403);
  }

  let email: string | undefined;
  try {
    ({ email } = await req.json());
  } catch {
    return json({ error: 'طلب غير صالح' }, 400);
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return json({ error: 'اكتب إيميل صحيح' }, 400);
  }

  // Elevated client — the ONLY place service_role is ever used, server-side.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);

  if (inviteError) return json({ error: inviteError.message }, 400);

  return json({ success: true, userId: inviteData.user?.id });
});
