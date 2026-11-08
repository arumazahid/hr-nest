alter table companies
  add column join_code text not null default upper(substr(md5(random()::text), 1, 6)),
  add column phone text;
create unique index companies_join_code_idx on companies (join_code);

alter table staff
  add column status text not null default 'active' check (status in ('pending', 'active', 'rejected')),
  add column employee_id uuid references employees(id) on delete set null;
alter table staff drop constraint staff_role_check;
alter table staff add constraint staff_role_check check (role in ('admin', 'hr', 'payroll', 'viewer', 'employee'));

create or replace function public.my_role(cid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from companies where id = cid and owner_id = auth.uid()) then 'admin'
    else (select role from staff where company_id = cid and user_id = auth.uid() and status = 'active' limit 1)
  end
$$;

alter table candidates drop constraint candidates_source_check;
alter table candidates add constraint candidates_source_check check (source in ('upload', 'apply', 'email', 'link'));
alter table candidates add column status text not null default 'new' check (status in ('new', 'shortlisted', 'interview', 'selected', 'rejected'));

create table interviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  scheduled_at timestamptz not null,
  mode text not null default 'in-person' check (mode in ('in-person', 'online', 'phone')),
  place text,
  interviewer text,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  result text not null default 'pending' check (result in ('pending', 'selected', 'hold', 'rejected')),
  created_at timestamptz not null default now()
);
create index on interviews (company_id, scheduled_at);

create table letter_defaults (
  company_id uuid primary key references companies(id) on delete cascade,
  data jsonb not null default '{}'
);

alter table interviews enable row level security;
alter table letter_defaults enable row level security;

create policy "read interviews" on interviews for select using (public.my_role(company_id) = any('{admin,hr,viewer}'::text[]));
create policy "write interviews" on interviews for all
  using (public.my_role(company_id) = any('{admin,hr}'::text[])) with check (public.my_role(company_id) = any('{admin,hr}'::text[]));
create policy "read letter_defaults" on letter_defaults for select using (public.my_role(company_id) = any('{admin,hr}'::text[]));
create policy "write letter_defaults" on letter_defaults for all
  using (public.my_role(company_id) = any('{admin,hr}'::text[])) with check (public.my_role(company_id) = any('{admin,hr}'::text[]));
