-- HR Nest schema 13: a "manager" (team head) account type.
-- A manager is an approved employee whose team is the department they belong to.
-- Managers read their team only through the server (/api/team), so no direct table access is opened to them.
alter table staff drop constraint staff_role_check;
alter table staff add constraint staff_role_check check (role in ('admin', 'hr', 'payroll', 'viewer', 'employee', 'manager'));
