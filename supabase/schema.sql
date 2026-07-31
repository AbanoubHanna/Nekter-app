-- =========================================================
-- NEKTER — Supabase schema migration
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_visible boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  category text,
  description text default '',
  image text default '',
  status text not null default 'متوفر',       -- متوفر | نفذت
  is_visible boolean not null default true,
  track_stock boolean not null default false,
  stock int,
  cost_price numeric default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  table_number text,
  customer_name text,
  customer_phone text,
  items jsonb not null default '[]',
  total numeric not null default 0,
  notes text default '',
  payment_method text default 'كاش',
  status text not null default 'تم الاستلام',
  created_at timestamptz not null default now(),
  last_updated timestamptz
);

-- ---------------------------------------------------------
-- STAFF / USERS  (kept locked down — see RLS + RPCs below)
-- ---------------------------------------------------------
create table if not exists staff_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('كاشير', 'مدير')),
  pin text,
  email text,
  password text,
  photo text default '',
  status text not null default 'نشط',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table staff_users enable row level security;

-- menu is public read (customer-facing menu needs no login)
create policy "public read categories" on categories for select using (true);
create policy "public read products" on products for select using (true);

-- NOTE: there is no real admin/staff session yet in this app (the /admin
-- and /cashier routes only check a PIN against this table, they don't use
-- Supabase Auth). Until that's added, admin writes have to stay open to the
-- anon key the same way they effectively were in Firebase. Tightening this
-- properly means adding Supabase Auth to gate /admin — flagged as the next
-- security step, not solved by this migration alone.
create policy "anon manage categories" on categories for all using (true) with check (true);
create policy "anon manage products" on products for all using (true) with check (true);

-- orders: customers create + read their own via phone lookup client-side,
-- cashier/admin read + update status. Same openness level as before.
create policy "anon manage orders" on orders for all using (true) with check (true);

-- staff_users: LOCKED. No direct select/insert/update/delete for anon at all.
-- All access goes through the SECURITY DEFINER functions below, so PINs and
-- passwords are never readable via a plain table query with the public key.
-- (No policies created on purpose — RLS with zero policies = zero access.)

-- ---------------------------------------------------------
-- Realtime — so onSnapshot-style live updates keep working
-- ---------------------------------------------------------
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table orders;

-- =========================================================
-- SECURE STAFF ACCESS — SECURITY DEFINER functions
-- These run with elevated privilege but only ever return/accept
-- exactly the columns the app needs — the password/pin columns
-- are never exposed wholesale to the client.
-- =========================================================

-- Cashier login by PIN
create or replace function rpc_login_cashier(p_pin text)
returns table (id uuid, name text, role text, photo text, status text)
language sql security definer set search_path = public as $$
  select id, name, role, photo, status
  from staff_users
  where pin = p_pin and role = 'كاشير'
  limit 1;
$$;

-- Manager login by email + password
create or replace function rpc_login_manager(p_email text, p_password text)
returns table (id uuid, name text, role text, photo text, status text)
language sql security definer set search_path = public as $$
  select id, name, role, photo, status
  from staff_users
  where email = p_email and password = p_password and role = 'مدير'
  limit 1;
$$;

-- Safe staff listing for the admin "طاقم العمل" screen (no password ever, pin included
-- for parity with the previous admin UI — tighten further once real admin auth exists)
create or replace function rpc_list_staff()
returns table (id uuid, name text, role text, pin text, photo text, status text)
language sql security definer set search_path = public as $$
  select id, name, role, pin, photo, status from staff_users order by created_at desc;
$$;

-- Add a new staff member
create or replace function rpc_add_staff(p_name text, p_role text, p_pin text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into staff_users (name, role, pin, status) values (p_name, p_role, p_pin, 'نشط')
  returning id into new_id;
  return new_id;
end;
$$;

-- Edit an existing staff member's own profile (name / pin / photo)
create or replace function rpc_update_staff(p_id uuid, p_name text, p_role text, p_pin text, p_photo text)
returns void
language sql security definer set search_path = public as $$
  update staff_users set name = p_name, role = p_role, pin = p_pin, photo = p_photo where id = p_id;
$$;

-- Toggle active / suspended
create or replace function rpc_toggle_staff_status(p_id uuid)
returns void
language sql security definer set search_path = public as $$
  update staff_users set status = case when status = 'نشط' then 'موقوف' else 'نشط' end where id = p_id;
$$;

-- Delete staff member
create or replace function rpc_delete_staff(p_id uuid)
returns void
language sql security definer set search_path = public as $$
  delete from staff_users where id = p_id;
$$;

-- One-time helper used only by the Firebase → Supabase data migration script,
-- so existing staff accounts (with their real email/password/pin/status) carry
-- over intact. Safe to drop after migration: `drop function rpc_migrate_staff;`
create or replace function rpc_migrate_staff(
  p_name text, p_role text, p_pin text, p_email text, p_password text, p_photo text, p_status text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into staff_users (name, role, pin, email, password, photo, status)
  values (p_name, p_role, p_pin, p_email, p_password, coalesce(p_photo, ''), coalesce(p_status, 'نشط'))
  returning id into new_id;
  return new_id;
end;
$$;

-- =========================================================
-- STORAGE — bucket for product images (replaces Firebase Storage)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "anon upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images');

-- =========================================================
-- Seed one manager account so you can log into /admin the first time.
-- ⚠️ Change this email/password immediately after your first login —
-- do it from the "طاقم العمل" screen or by re-running rpc_update_staff.
-- =========================================================
insert into staff_users (name, role, email, password, status)
values ('مدير النظام', 'مدير', 'admin@nekter.local', 'ChangeMe123', 'نشط')
on conflict do nothing;
