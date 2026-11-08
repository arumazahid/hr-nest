alter table leaves
  add column leave_type text not null default 'annual' check (leave_type in ('annual', 'sick', 'unpaid')),
  add column status text not null default 'approved' check (status in ('pending', 'approved', 'rejected'));

alter table companies
  add column annual_leaves int not null default 14,
  add column sick_leaves int not null default 10;

create table performance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  month text not null,
  rating int check (rating between 1 and 5),
  notes text,
  unique (employee_id, month)
);

create index on performance (company_id, month);
create index on leaves (company_id, status);

alter table performance enable row level security;

create policy "read performance" on performance for select
  using (public.my_role(company_id) = any('{admin,hr,viewer}'::text[]));
create policy "write performance" on performance for all
  using (public.my_role(company_id) = any('{admin,hr}'::text[]))
  with check (public.my_role(company_id) = any('{admin,hr}'::text[]));
