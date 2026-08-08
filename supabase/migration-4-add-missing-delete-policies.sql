-- products and categories got insert/update/select policies from
-- auth-hardening.sql but no delete policy was ever added (rewards got one
-- correctly in migration-2). Result: an authenticated admin's delete request
-- is silently filtered by RLS — Supabase returns success with zero rows
-- affected, no error, so the UI acts like the delete worked while nothing
-- actually happened in the database.

create policy "authenticated delete products" on products
  for delete using (auth.role() = 'authenticated');

create policy "authenticated delete categories" on categories
  for delete using (auth.role() = 'authenticated');
