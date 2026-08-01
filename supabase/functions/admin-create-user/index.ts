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
  // Supabase's project-level default Site URL is still the localhost:3000
  // placeholder, so every invite must explicitly override where it lands —
  // otherwise the emailed link redirects to a dead localhost address.
  // NOTE: the exact same URL must also be added to Authentication → URL
  // Configuration → Redirect URLs in the Supabase Dashboard, or Supabase
  // silently ignores this override and falls back to the Site URL anyway.
  const appUrl = Deno.env.get('APP_URL') ?? 'https://nekter-app.vercel.app';
  const redirectTo = `${appUrl}/admin?invite=1`;

  const sendInvite = () => adminClient.auth.admin.inviteUserByEmail(email!, { redirectTo });
  let { data: inviteData, error: inviteError } = await sendInvite();

  // If an earlier invite to this same email never got completed (link expired,
  // redirect was broken before this fix, etc.), Supabase refuses to send a new
  // one because the account already exists. Self-heal: only if that account
  // has NEVER actually logged in (proof it's a stuck, incomplete invite, not
  // a real admin), remove it and resend a fresh invite automatically.
  if (inviteError && /already been registered|email_exists/i.test(inviteError.message ?? inviteError.code ?? '')) {
    const { data: list, error: listError } = await adminClient.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === email);

    if (!listError && existing && !existing.last_sign_in_at) {
      await adminClient.auth.admin.deleteUser(existing.id);
      ({ data: inviteData, error: inviteError } = await sendInvite());
    } else if (existing) {
      return json({ error: 'الإيميل ده عنده حساب فعّال بالفعل — اطلب منه يسجّل دخول عادي من /admin بدل الدعوة' }, 400);
    }
  }

  if (inviteError) return json({ error: inviteError.message }, 400);

  return json({ success: true, userId: inviteData?.user?.id });
});
