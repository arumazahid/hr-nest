-- HR Nest schema 10: editable mail templates, and who the emails are signed by

alter table companies
  add column hr_name text,
  add column hr_title text,
  add column reply_to_email text;

create table mail_templates (
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null check (kind in ('interview', 'selected', 'rejected')),
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now(),
  primary key (company_id, kind)
);

alter table mail_templates enable row level security;

create policy "read mail templates" on mail_templates for select
  using (public.my_role(company_id) = any('{admin,hr}'::text[]));
create policy "write mail templates" on mail_templates for all
  using (public.my_role(company_id) = any('{admin,hr}'::text[]))
  with check (public.my_role(company_id) = any('{admin,hr}'::text[]));
