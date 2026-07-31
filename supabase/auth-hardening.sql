-- =========================================================
-- NEKTER — Auth hardening for /admin
-- Run this in the SQL Editor AFTER schema.sql has already been applied.
-- This locks product/category writes and all staff RPCs behind a real
-- Supabase Auth session, instead of being open to anyone with the anon key.
-- =========================================================

-- Replace the fully-open policies with read-open / write-authenticated-only
drop policy if exists "anon manage categories" on categories;
drop policy if exists "anon manage products" on products;

create policy "authenticated write categories" on categories
  for insert to authenticated with check (true);
create policy "authenticated update categories" on categories
  for update to authenticated using (true) with check (true);
create policy "authenticated delete categories" on categories
  for delete to authenticated using (true);

create policy "authenticated write products" on products
  for insert to authenticated with check (true);
create policy "authenticated update products" on products
  for update to authenticated using (true) with check (true);
create policy "authenticated delete products" on products
  for delete to authenticated using (true);

-- orders stay open to anon: customers submit without logging in, and the
-- cashier app updates status using its own PIN check rather than Supabase
-- Auth. That's a separate, smaller-scoped concern from /admin access.

-- Require a real logged-in session for every staff-management RPC
create or replace function rpc_list_staff()
returns table (id uuid, name text, role text, pin text, photo text, status text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  return query select id, name, role, pin, photo, status from staff_users order by created_at desc;
end;
$$;

create or replace function rpc_add_staff(p_name text, p_role text, p_pin text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  insert into staff_users (name, role, pin, status) values (p_name, p_role, p_pin, 'نشط')
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function rpc_update_staff(p_id uuid, p_name text, p_role text, p_pin text, p_photo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  update staff_users set name = p_name, role = p_role, pin = p_pin, photo = p_photo where id = p_id;
end;
$$;

create or replace function rpc_toggle_staff_status(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  update staff_users set status = case when status = 'نشط' then 'موقوف' else 'نشط' end where id = p_id;
end;
$$;

create or replace function rpc_delete_staff(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  delete from staff_users where id = p_id;
end;
$$;

-- NOTE: rpc_login_cashier / rpc_login_manager are left untouched on purpose —
-- those ARE the pre-login endpoints the /cashier screen calls before anyone
-- is authenticated.
