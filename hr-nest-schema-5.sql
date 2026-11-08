alter table employees add column photo_url text;

update employees set tax_percent = 0 where tax_percent < 0 or tax_percent > 100;
alter table employees add constraint tax_percent_range check (tax_percent between 0 and 100);

alter table companies add column employee_limit int not null default 50;

alter table payroll
  add column bonus numeric not null default 0,
  add column overtime numeric not null default 0;

create or replace function check_employee_limit() returns trigger language plpgsql as $$
declare lim int; cnt int;
begin
  select employee_limit into lim from companies where id = new.company_id;
  select count(*) into cnt from employees where company_id = new.company_id and active;
  if cnt >= lim then
    raise exception 'Employee limit reached for your plan (% employees)', lim;
  end if;
  return new;
end $$;

create trigger employee_limit_trg before insert on employees
for each row execute function check_employee_limit();

create or replace function protect_employee_limit() returns trigger language plpgsql as $$
begin
  if new.employee_limit is distinct from old.employee_limit and auth.uid() is not null then
    new.employee_limit := old.employee_limit;
  end if;
  return new;
end $$;

create trigger protect_limit_trg before update on companies
for each row execute function protect_employee_limit();
