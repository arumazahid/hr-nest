alter table companies
  add column brand_primary text not null default '#0F172A',
  add column brand_accent text not null default '#FACC15',
  add column tagline text,
  add column website text,
  add column contact_email text,
  add column address text,
  add column payslip_template text not null default 'modern' check (payslip_template in ('modern', 'classic'));

create table pay_components (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('earning', 'deduction')),
  calc text not null default 'fixed' check (calc in ('fixed', 'percent')),
  value numeric not null default 0 check (value >= 0),
  created_at timestamptz not null default now()
);
create index on pay_components (company_id);
alter table pay_components enable row level security;
create policy "read pay_components" on pay_components for select
  using (public.my_role(company_id) = any('{admin,payroll}'::text[]));
create policy "write pay_components" on pay_components for all
  using (public.my_role(company_id) = any('{admin,payroll}'::text[]))
  with check (public.my_role(company_id) = any('{admin,payroll}'::text[]));

alter table employees add column left_on date, add column left_reason text;

create table company_secrets (
  company_id uuid primary key references companies(id) on delete cascade,
  imap_password_enc text
);
alter table company_secrets enable row level security;
insert into company_secrets (company_id, imap_password_enc)
  select id, imap_password_enc from companies where imap_password_enc is not null;
alter table companies drop column imap_password_enc;
