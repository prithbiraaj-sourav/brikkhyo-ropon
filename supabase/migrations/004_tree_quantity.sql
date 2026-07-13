-- ============================================================
-- বৃক্ষ নিধি — Multiple tree types per submission
-- Run this in Supabase SQL Editor after 003_location_name.sql
-- ============================================================

-- A single submission can now list several tree species planted at the
-- same spot; each species becomes its own row, quantity records how many
-- of that species were planted.
alter table public.trees add column if not exists quantity integer not null default 1;
alter table public.trees add constraint trees_quantity_positive check (quantity > 0);

-- Recompute stats/summaries as a sum of quantity instead of a row count,
-- since one row can now represent many physical trees.
create or replace view public.tree_stats as
select
  coalesce(sum(quantity), 0)                                      as total,
  coalesce(sum(quantity) filter (where status = 'verified'), 0)   as verified,
  coalesce(sum(quantity) filter (where status = 'pending'), 0)    as pending,
  count(distinct department)                                      as organizations,
  count(distinct tree_name)                                       as species,
  count(distinct zone)                                            as zones,
  date_trunc('day', min(created_at))                              as first_plant_date,
  date_trunc('day', max(created_at))                              as last_plant_date
from public.trees;

create or replace view public.zone_summary as
select
  zone,
  coalesce(sum(quantity), 0)                                    as total,
  coalesce(sum(quantity) filter (where status = 'verified'), 0) as verified
from public.trees
group by zone
order by total desc;

create or replace view public.species_summary as
select
  tree_name,
  coalesce(sum(quantity), 0) as total
from public.trees
group by tree_name
order by total desc
limit 20;

create or replace view public.daily_counts as
select
  date_trunc('day', created_at)::date as plant_date,
  coalesce(sum(quantity), 0) as count
from public.trees
where created_at >= now() - interval '90 days'
group by 1
order by 1;
