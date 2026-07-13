-- ============================================================
-- বৃক্ষ নিধি — Optional descriptive location label
-- Run this in Supabase SQL Editor after 002_organizations.sql
-- ============================================================

-- The volunteer form now sets latitude/longitude by dropping a pin on a
-- map instead of capturing browser GPS. This optional free-text field lets
-- volunteers add a landmark description (e.g. "মসজিদের পাশে") alongside
-- the precise coordinates.
alter table public.trees add column if not exists location_name text;
