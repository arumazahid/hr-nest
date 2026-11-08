-- HR Nest schema 9: fixes "new row violates row-level security policy for table companies"
-- when creating a company. The old read policy goes through my_role(), which cannot see a row
-- that is being inserted in the same statement, so the insert's returning step was rejected.
-- This policy lets the owner read their own company directly.
create policy "owner reads own company" on companies for select using (owner_id = auth.uid());
