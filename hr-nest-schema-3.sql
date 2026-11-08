create table staff (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text,
  role text not null check (role in ('admin', 'hr', 'payroll', 'viewer')),
  created_at timestamptz not null default now(),
  unique (company_id, email)
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  head text,
  unique (company_id, name)
);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  day date not null,
  name text not null,
  unique (company_id, day)
);

alter table employees
  add column employee_code text,
  add column department_id uuid references departments(id) on delete set null,
  add column national_id text,
  add column date_of_birth date,
  add column gender text,
  add column address text,
  add column emergency_name text,
  add column emergency_phone text;

alter table companies add column weekend_days int[] not null default '{0,6}';

update employees e set employee_code = 'EMP-' || lpad(r.n::text, 3, '0')
from (select id, row_number() over (partition by company_id order by created_at) n from employees) r
where e.id = r.id and e.employee_code is null;

alter table employees add constraint employees_code_unique unique (company_id, employee_code);

create or replace function set_employee_code() returns trigger language plpgsql as $$
begin
  if new.employee_code is null then
    select 'EMP-' || lpad((coalesce(max(substr(employee_code, 5)::int), 0) + 1)::text, 3, '0')
    into new.employee_code from employees where company_id = new.company_id;
  end if;
  return new;
end $$;

create trigger employee_code_trg before insert on employees
for each row execute function set_employee_code();

create or replace function public.my_role(cid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from companies where id = cid and owner_id = auth.uid()) then 'admin'
    else (select role from staff where company_id = cid and user_id = auth.uid() limit 1)
  end
$$;

drop policy "owner manages company" on companies;
drop policy "owner manages jobs" on jobs;
drop policy "owner manages candidates" on candidates;
drop policy "owner manages scores" on candidate_scores;
drop policy "owner manages employees" on employees;
drop policy "owner manages attendance" on attendance;
drop policy "owner manages leaves" on leaves;
drop policy "owner manages payroll" on payroll;

alter table staff enable row level security;
alter table departments enable row level security;
alter table holidays enable row level security;

create policy "members read company" on companies for select using (public.my_role(id) is not null);
create policy "owner creates company" on companies for insert with check (owner_id = auth.uid());
create policy "admin updates company" on companies for update using (public.my_role(id) = 'admin') with check (public.my_role(id) = 'admin');
create policy "admin deletes company" on companies for delete using (public.my_role(id) = 'admin');

create policy "admin reads staff" on staff for select using (public.my_role(company_id) = 'admin' or user_id = auth.uid());
create policy "admin writes staff" on staff for all using (public.my_role(company_id) = 'admin') with check (public.my_role(company_id) = 'admin');

do $$
declare r record;
begin
  for r in select * from (values
    ('jobs', '{admin,hr,payroll,viewer}', '{admin,hr}'),
    ('candidates', '{admin,hr,payroll,viewer}', '{admin,hr}'),
    ('candidate_scores', '{admin,hr,payroll,viewer}', '{admin,hr}'),
    ('employees', '{admin,hr,payroll,viewer}', '{admin,hr}'),
    ('attendance', '{admin,hr,payroll,viewer}', '{admin,hr}'),
    ('leaves', '{admin,hr,payroll,viewer}', '{admin,hr}'),
    ('departments', '{admin,hr,payroll,viewer}', '{admin}'),
    ('holidays', '{admin,hr,payroll,viewer}', '{admin,hr}'),
    ('payroll', '{admin,payroll}', '{admin,payroll}')
  ) as v(t, rd, wr) loop
    execute format('create policy "read %1$s" on %1$I for select using (public.my_role(company_id) = any(%2$L::text[]))', r.t, r.rd);
    execute format('create policy "insert %1$s" on %1$I for insert with check (public.my_role(company_id) = any(%2$L::text[]))', r.t, r.wr);
    execute format('create policy "update %1$s" on %1$I for update using (public.my_role(company_id) = any(%2$L::text[])) with check (public.my_role(company_id) = any(%2$L::text[]))', r.t, r.wr);
    execute format('create policy "delete %1$s" on %1$I for delete using (public.my_role(company_id) = any(%2$L::text[]))', r.t, r.wr);
  end loop;
end $$;
