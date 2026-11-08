alter table companies
  add column office_lat double precision,
  add column office_lng double precision,
  add column office_radius_m int not null default 200,
  add column timezone text not null default 'UTC',
  add column face_enabled boolean not null default false,
  add column gps_enabled boolean not null default true;

create table employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  job_title text,
  joining_date date,
  monthly_salary numeric not null,
  allowances numeric not null default 0,
  tax_percent numeric not null default 0,
  qr_token text not null unique default (md5(random()::text || clock_timestamp()::text) || substr(md5(random()::text), 1, 8)),
  face_descriptor jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  day date not null,
  check_in timestamptz,
  check_out timestamptz,
  method text not null,
  late boolean not null default false,
  lat double precision,
  lng double precision,
  unique (employee_id, day)
);

create table leaves (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  day date not null,
  type text not null default 'full' check (type in ('full', 'half')),
  reason text,
  unique (employee_id, day)
);

create table payroll (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  month text not null,
  basic numeric not null,
  allowances numeric not null default 0,
  absent_deduction numeric not null default 0,
  leave_deduction numeric not null default 0,
  late_deduction numeric not null default 0,
  tax numeric not null default 0,
  net numeric not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (employee_id, month)
);

create index on employees (company_id);
create index on attendance (company_id, day);
create index on leaves (company_id, day);
create index on payroll (company_id, month);

do $$
declare t text;
begin
  foreach t in array array['employees', 'attendance', 'leaves', 'payroll'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner manages %1$s" on %1$I for all using (company_id in (select id from companies where owner_id = auth.uid())) with check (company_id in (select id from companies where owner_id = auth.uid()))', t);
  end loop;
end $$;
