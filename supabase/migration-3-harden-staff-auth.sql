-- =========================================================
-- NEKTER — Migration 3: harden & unify admin/staff auth
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- PREREQUISITE: schema.sql, auth-hardening.sql, migration-2-new-features.sql
-- must already be applied.
--
-- Problem this fixes (see CLAUDE.md "نظامين مدير منفصلين"):
--   1. staff_users.pin and staff_users.password were stored and compared
--      as PLAINTEXT (`pin = p_pin`). Anyone with DB access could read
--      every cashier's PIN directly.
--   2. rpc_list_staff() returned the raw PIN to the client, and the
--      admin "طاقم العمل" screen displayed it in a plain <td>.
--   3. staff_users had its own separate "مدير" (manager) login
--      (email + plaintext password via rpc_login_manager), completely
--      disconnected from the real admin_profiles / Supabase Auth system
--      that /admin uses — two unrelated concepts of "manager", one of
--      them much weaker than the other.
--
-- What this migration does:
--   1. Hashes every existing PIN/password with pgcrypto (bcrypt).
--   2. Makes rpc_login_cashier compare the bcrypt hash instead of raw text.
--   3. Drops rpc_login_manager entirely — admin_profiles + Supabase Auth
--      (i.e. /admin) is now the ONLY way to get manager-level access.
--      The "إدارة" tab inside /cashier is removed on the frontend to match.
--   4. Stops rpc_list_staff from ever returning a PIN (hashed or not).
--   5. rpc_add_staff / rpc_update_staff now hash whatever PIN they're
--      given; rpc_update_staff treats a NULL PIN as "leave unchanged"
--      (needed because the admin editing someone else's profile no
--      longer has access to their current PIN to resend it).
--   6. Adds rpc_reset_staff_pin(id, new_pin) for explicitly setting a
--      fresh PIN without ever reading the old one back.
--
-- NOTE: on most Supabase projects, `pgcrypto` installs into the
-- `extensions` schema (not `public`), so every statement below that
-- calls crypt()/gen_salt() explicitly includes `extensions` in its
-- search_path. Safe even if your project has it in `public` instead —
-- an extra, empty schema in the search_path is a harmless no-op.
--
-- Safe to run more than once (hashing step skips already-hashed values).
-- =========================================================

-- Make crypt()/gen_salt() visible to the plain UPDATE statements below
-- (these run in the SQL Editor's own session, not inside a function).
set search_path = public, extensions;

-- 1) Hash any existing plaintext PIN/password. bcrypt hashes always start
--    with "$2" — used here as a cheap "already hashed" guard so re-running
--    this migration doesn't double-hash.
update staff_users
set pin = crypt(pin, gen_salt('bf'))
where pin is not null and pin not like '$2%';

update staff_users
set password = crypt(password, gen_salt('bf'))
where password is not null and password not like '$2%';

-- 2) Cashier login now checks the bcrypt hash instead of raw equality.
create or replace function rpc_login_cashier(p_pin text)
returns table (id uuid, name text, role text, photo text, status text)
language sql security definer set search_path = public, extensions as $$
  select id, name, role, photo, status
  from staff_users
  where role = 'كاشير' and pin is not null and pin = crypt(p_pin, pin)
  limit 1;
$$;

-- 3) Retire the separate manager-login path. /admin (Supabase Auth +
--    admin_profiles) is the single source of truth for manager access now.
drop function if exists rpc_login_manager(text, text);

-- 4) Never send a PIN back to the client again. The return row shape is
--    changing (dropping the `pin` column), so the old function has to be
--    dropped first — Postgres won't let CREATE OR REPLACE change a
--    RETURNS TABLE shape in place.
drop function if exists rpc_list_staff();
create or replace function rpc_list_staff()
returns table (id uuid, name text, role text, photo text, status text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  return query select id, name, role, photo, status from staff_users order by created_at desc;
end;
$$;

-- 5) Hash the PIN on write. NULL p_pin in an update = "don't change it".
create or replace function rpc_add_staff(p_name text, p_role text, p_pin text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  insert into staff_users (name, role, pin, status)
  values (p_name, p_role, case when p_pin is null then null else crypt(p_pin, gen_salt('bf')) end, 'نشط')
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function rpc_update_staff(p_id uuid, p_name text, p_role text, p_pin text, p_photo text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_pin is null or p_pin = '' then
    update staff_users set name = p_name, role = p_role, photo = p_photo where id = p_id;
  else
    update staff_users set name = p_name, role = p_role, pin = crypt(p_pin, gen_salt('bf')), photo = p_photo where id = p_id;
  end if;
end;
$$;

-- 6) Dedicated PIN reset — never requires or returns the previous PIN.
create or replace function rpc_reset_staff_pin(p_id uuid, p_new_pin text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  update staff_users set pin = crypt(p_new_pin, gen_salt('bf')) where id = p_id;
end;
$$;

-- rpc_toggle_staff_status and rpc_delete_staff (the مدير عام-only version
-- from migration-2-new-features.sql) are untouched — they never handled
-- pin/password and stay exactly as already defined.

-- =========================================================
-- ⚠️ MANUAL STEP — do this yourself, this migration can't do it for you:
-- The seed row from schema.sql (email 'admin@nekter.local', plaintext
-- password 'ChangeMe123', role 'مدير') can no longer log in anywhere
-- now that rpc_login_manager is gone, but it still sits in the table
-- (now hashed by step 1 above, but still worth clearing out).
-- If you never used this row for anything else, delete it:
--   delete from staff_users where email = 'admin@nekter.local';
-- =========================================================
