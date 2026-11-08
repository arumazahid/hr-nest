-- HR Nest schema 11: Community (discussion board). Private to each company.
-- Everyone who works for the company (and approved employees) can read and ask questions.
-- Only HR and admin can mark answered, and authors can remove their own posts.

create table discussion_threads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  author_id uuid not null,
  author_name text not null,
  author_role text not null,
  title text not null,
  body text not null default '',
  status text not null default 'open' check (status in ('open', 'answered')),
  created_at timestamptz not null default now()
);
create index on discussion_threads (company_id, created_at desc);

create table discussion_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references discussion_threads(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  author_id uuid not null,
  author_name text not null,
  author_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index on discussion_replies (thread_id, created_at);

alter table discussion_threads enable row level security;
alter table discussion_replies enable row level security;

create policy "members read threads" on discussion_threads for select using (public.my_role(company_id) is not null);
create policy "members ask" on discussion_threads for insert with check (public.my_role(company_id) is not null and author_id = auth.uid());
create policy "hr updates threads" on discussion_threads for update
  using (public.my_role(company_id) = any('{admin,hr}'::text[])) with check (public.my_role(company_id) = any('{admin,hr}'::text[]));
create policy "author or hr deletes threads" on discussion_threads for delete
  using (author_id = auth.uid() or public.my_role(company_id) = any('{admin,hr}'::text[]));

create policy "members read replies" on discussion_replies for select using (public.my_role(company_id) is not null);
create policy "members reply" on discussion_replies for insert with check (public.my_role(company_id) is not null and author_id = auth.uid());
create policy "author or hr deletes replies" on discussion_replies for delete
  using (author_id = auth.uid() or public.my_role(company_id) = any('{admin,hr}'::text[]));
