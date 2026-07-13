-- ============================================================
-- বৃক্ষ নিধি — Organization summary view
-- Run this in Supabase SQL Editor after 004_tree_quantity.sql
-- ============================================================

-- Organization-wise planting totals, shown on the admin overview page
-- alongside the existing zone/species breakdowns.
create or replace view public.organization_summary as
select
  department,
  coalesce(sum(quantity), 0) as total
from public.trees
group by department
order by total desc
limit 20;
