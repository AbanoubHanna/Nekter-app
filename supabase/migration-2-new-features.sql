-- =========================================================
-- NEKTER — Migration batch 2: everything added in this round
--   • Tiered admin permissions (مدير عام / مشرف) + automatic audit log
--   • Combos & deals support
--   • Redeemable loyalty points
--
-- PREREQUISITE: schema.sql and auth-hardening.sql must already be applied
-- (you ran these in an earlier session).
--
-- HOW TO RUN: paste this whole file into Supabase Dashboard → SQL Editor →
-- New query → Run. Safe to run once.
-- =========================================================

-- =========================================================
-- NEKTER — Admin roles + audit log
-- Run this in the SQL Editor AFTER schema.sql and auth-hardening.sql.
-- =========================================================

-- ---------------------------------------------------------
-- ADMIN PROFILES — tiered permissions on top of Supabase Auth
-- ---------------------------------------------------------
create table if not exists admin_profiles (
  id uuid primary key,                 -- = auth.uid()
  email text not null,
  role text not null default 'مشرف' check (role in ('مدير عام', 'مشرف')),
  created_at timestamptz not null default now()
);

alter table admin_profiles enable row level security;

-- any logged-in admin can see the list (needed so a مدير عام can promote/demote)
create policy "authenticated read admin profiles" on admin_profiles
  for select to authenticated using (true);

-- Bootstrap: the very first person to ever log in becomes "مدير عام".
-- Everyone after that starts as "مشرف" until a مدير عام promotes them.
create or replace function rpc_ensure_admin_profile()
returns table (role text)
language plpgsql security definer set search_path = public as $$
declare
  existing_role text;
  total_admins int;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;

  select p.role into existing_role from admin_profiles p where p.id = auth.uid();
  if existing_role is not null then
    return query select existing_role;
    return;
  end if;

  select count(*) into total_admins from admin_profiles;

  insert into admin_profiles (id, email, role)
  values (auth.uid(), auth.email(), case when total_admins = 0 then 'مدير عام' else 'مشرف' end);

  return query select case when total_admins = 0 then 'مدير عام' else 'مشرف' end;
end;
$$;

-- Only a "مدير عام" can change someone else's role
create or replace function rpc_set_admin_role(p_email text, p_role text)
returns void
language plpgsql security definer set search_path = public as $$
declare caller_role text;
begin
  select role into caller_role from admin_profiles where id = auth.uid();
  if caller_role is distinct from 'مدير عام' then
    raise exception 'الصلاحية دي لمدير عام بس';
  end if;
  update admin_profiles set role = p_role where email = p_email;
end;
$$;

-- ---------------------------------------------------------
-- AUDIT LOG — filled automatically by triggers, never by the client directly
-- ---------------------------------------------------------
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor_email text,
  action text not null,         -- INSERT | UPDATE | DELETE
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;

-- only a مدير عام can read the log; nobody can write to it directly (triggers use SECURITY DEFINER)
create policy "super admin reads audit log" on audit_log
  for select to authenticated using (
    exists (select 1 from admin_profiles p where p.id = auth.uid() and p.role = 'مدير عام')
  );

create or replace function fn_audit_trigger()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_email, action, table_name, record_id, old_data, new_data)
  values (
    coalesce(auth.email(), 'نظام/كاشير'),
    TG_OP,
    TG_TABLE_NAME,
    coalesce(new.id::text, old.id::text),
    case when TG_OP <> 'INSERT' then to_jsonb(old) else null end,
    case when TG_OP <> 'DELETE' then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_products on products;
create trigger trg_audit_products
  after insert or update or delete on products
  for each row execute function fn_audit_trigger();

drop trigger if exists trg_audit_categories on categories;
create trigger trg_audit_categories
  after insert or update or delete on categories
  for each row execute function fn_audit_trigger();

drop trigger if exists trg_audit_staff on staff_users;
create trigger trg_audit_staff
  after insert or update or delete on staff_users
  for each row execute function fn_audit_trigger();

-- ---------------------------------------------------------
-- Lock down staff RPCs further: a "مشرف" can still manage the cashier
-- team day-to-day, but only "مدير عام" can permanently delete a staff record.
-- ---------------------------------------------------------
create or replace function rpc_delete_staff(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare caller_role text;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  select role into caller_role from admin_profiles where id = auth.uid();
  if caller_role is distinct from 'مدير عام' then
    raise exception 'حذف موظف صلاحية مدير عام بس';
  end if;
  delete from staff_users where id = p_id;
end;
$$;
-- =========================================================
-- NEKTER — Combos & deals
-- Run after the previous migration files.
-- Reuses the existing `products` table so combos flow through the same
-- menu, cart, cashier, and reporting pipeline as any other item — a combo
-- is just a product flagged is_combo = true, with combo_items describing
-- what's inside (shown to the customer / kitchen, doesn't affect stock math).
-- =========================================================

alter table products add column if not exists is_combo boolean not null default false;
alter table products add column if not exists combo_items jsonb not null default '[]';
-- =========================================================
-- NEKTER — Redeemable loyalty points
-- Run after the previous migration files.
--
-- Points themselves stay derived client-side from order history (as before:
-- floor(total spent / 10)), minus whatever has already been redeemed here.
-- This keeps the same trust model the app already has (no customer login —
-- points are tied to a self-reported phone number, same as order tracking).
-- =========================================================

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points_cost int not null,
  image text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null,
  reward_id uuid references rewards(id),
  reward_name text not null,
  points_cost int not null,
  code text not null unique,
  status text not null default 'غير مستخدم' check (status in ('غير مستخدم', 'مستخدم')),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table rewards enable row level security;
alter table loyalty_redemptions enable row level security;

-- rewards: everyone can see the active catalog; only logged-in admins manage it
create policy "public read rewards" on rewards for select using (true);
create policy "authenticated write rewards" on rewards for insert to authenticated with check (true);
create policy "authenticated update rewards" on rewards for update to authenticated using (true) with check (true);
create policy "authenticated delete rewards" on rewards for delete to authenticated using (true);

-- redemptions: open to anon like `orders` — customer creates one, cashier marks it used
create policy "anon manage redemptions" on loyalty_redemptions for all using (true) with check (true);

alter publication supabase_realtime add table rewards;
alter publication supabase_realtime add table loyalty_redemptions;
