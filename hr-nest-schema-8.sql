-- HR Nest schema 8: profiles, ID verification on sign-up, private admin activity log

alter table companies
  add column owner_name text,
  add column owner_avatar text;

alter table staff
  add column avatar_url text,
  add column id_verified boolean not null default false;

-- Activity log: only the company owner (admin) can read it. HR and employees can never see it.
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index on activity_log (company_id, created_at desc);

alter table activity_log enable row level security;

create policy "admin reads activity" on activity_log for select
  using (exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid()));

create policy "staff add own activity" on activity_log for insert
  with check (public.my_role(company_id) = any('{admin,hr}'::text[]) and actor_id = auth.uid());

-- No update or delete policies on purpose: the log cannot be edited or erased from the app.
