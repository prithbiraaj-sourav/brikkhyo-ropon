-- ============================================================
-- বৃক্ষ নিধি — Organizations + optional volunteer identity
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Organizations table — admin-managed list shown in the volunteer form's
-- organization dropdown (replaces free-text department entry).
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create policy "public_read_organizations"
  on public.organizations for select
  to anon
  using (true);

create policy "admin_full_access_organizations"
  on public.organizations for all
  to authenticated
  using (true)
  with check (true);

-- The submission form no longer collects volunteer name/phone — the
-- organization dropdown is now the only identifying info required.
alter table public.trees alter column volunteer_name drop not null;
alter table public.trees alter column phone drop not null;

-- "volunteers" stat no longer makes sense without collecting names;
-- report distinct participating organizations instead. Postgres won't let
-- CREATE OR REPLACE VIEW rename a column, so drop and recreate instead.
drop view if exists public.tree_stats;

create view public.tree_stats as
select
  count(*)                                        as total,
  count(*) filter (where status = 'verified')     as verified,
  count(*) filter (where status = 'pending')      as pending,
  count(distinct department)                      as organizations,
  count(distinct tree_name)                       as species,
  count(distinct zone)                            as zones,
  date_trunc('day', min(created_at))              as first_plant_date,
  date_trunc('day', max(created_at))              as last_plant_date
from public.trees;
