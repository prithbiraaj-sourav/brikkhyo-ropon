-- ============================================================
-- বৃক্ষ নিধি — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Trees table
create table if not exists public.trees (
  id           uuid primary key default gen_random_uuid(),
  tree_code    text unique not null,          -- e.g. BN-000001
  
  -- Volunteer info
  volunteer_name  text not null,
  phone           text not null,
  department      text not null,
  
  -- Plantation info
  zone            text not null,              -- union/area name
  tree_name       text not null,              -- Bangla common name
  tree_scientific text,                       -- Latin name (optional)
  notes           text,
  
  -- Location (Shariatpur Sadar bounds: lat 23.08–23.18, lng 90.14–90.23)
  latitude        double precision not null
                    check (latitude  between 23.05 and 23.30),
  longitude       double precision not null
                    check (longitude between 90.10 and 90.35),
  
  -- Status
  status          text not null default 'pending'
                    check (status in ('pending', 'verified', 'rejected')),
  verified_by     text,
  verified_at     timestamptz,
  
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-generate tree_code like BN-000001
create sequence if not exists tree_code_seq start 1;

create or replace function generate_tree_code()
returns trigger language plpgsql as $$
begin
  new.tree_code := 'BN-' || lpad(nextval('tree_code_seq')::text, 6, '0');
  return new;
end;
$$;

create trigger set_tree_code
  before insert on public.trees
  for each row
  when (new.tree_code is null or new.tree_code = '')
  execute function generate_tree_code();

-- Update updated_at automatically
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trees_updated_at
  before update on public.trees
  for each row execute function update_updated_at();

-- Indexes for map queries (lat/lng range scans) and stats
create index idx_trees_location  on public.trees (latitude, longitude);
create index idx_trees_status    on public.trees (status);
create index idx_trees_zone      on public.trees (zone);
create index idx_trees_created   on public.trees (created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.trees enable row level security;

-- Volunteers can INSERT (anon key)
create policy "volunteers_can_insert"
  on public.trees for insert
  to anon
  with check (true);

-- Public can read verified trees (for map display)
create policy "public_read_verified"
  on public.trees for select
  to anon
  using (status = 'verified');

-- Authenticated users (admin) can read and update all
create policy "admin_full_access"
  on public.trees for all
  to authenticated
  using (true)
  with check (true);

-- ── Stats view (used by dashboard) ───────────────────────────────────────────
create or replace view public.tree_stats as
select
  count(*)                                        as total,
  count(*) filter (where status = 'verified')     as verified,
  count(*) filter (where status = 'pending')      as pending,
  count(distinct volunteer_name)                  as volunteers,
  count(distinct tree_name)                       as species,
  count(distinct zone)                            as zones,
  date_trunc('day', min(created_at))              as first_plant_date,
  date_trunc('day', max(created_at))              as last_plant_date
from public.trees;

-- Zone summary view
create or replace view public.zone_summary as
select
  zone,
  count(*)                                    as total,
  count(*) filter (where status='verified')   as verified
from public.trees
group by zone
order by total desc;

-- Species summary view
create or replace view public.species_summary as
select
  tree_name,
  count(*) as total
from public.trees
group by tree_name
order by total desc
limit 20;

-- Daily counts (for timeline chart)
create or replace view public.daily_counts as
select
  date_trunc('day', created_at)::date as plant_date,
  count(*) as count
from public.trees
where created_at >= now() - interval '90 days'
group by 1
order by 1;
