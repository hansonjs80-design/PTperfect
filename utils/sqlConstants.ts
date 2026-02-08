export const SUPABASE_INIT_SQL = `
-- =========================================================
-- PhysioTrack Pro Database Initialization (Integrated v2.1)
-- =========================================================

-- 1. Enable Extensions
create extension if not exists "pgcrypto";

-- 2. Trigger Function for Updated At
create or replace function public.handle_updated_at() 
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- 3. Table: Beds
-- =========================================================
create table if not exists public.beds (
  id integer primary key,
  status text not null default 'IDLE',
  current_preset_id text,
  custom_preset_json jsonb,
  current_step_index integer default 0,
  queue jsonb default '[]'::jsonb,
  start_time bigint,
  remaining_time integer default 0,
  original_duration integer default 0,
  is_paused boolean default false,
  is_injection boolean default false,
  is_fluid boolean default false,
  is_traction boolean default false,
  is_eswt boolean default false,
  is_manual boolean default false,
  memos jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Migration for beds columns (Safe Add)
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'beds' and column_name = 'is_manual') then
    alter table public.beds add column is_manual boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'beds' and column_name = 'is_eswt') then
    alter table public.beds add column is_eswt boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'beds' and column_name = 'is_fluid') then
    alter table public.beds add column is_fluid boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'beds' and column_name = 'is_traction') then
    alter table public.beds add column is_traction boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'beds' and column_name = 'is_injection') then
    alter table public.beds add column is_injection boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'beds' and column_name = 'original_duration') then
    alter table public.beds add column original_duration integer default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'beds' and column_name = 'custom_preset_json') then
    alter table public.beds add column custom_preset_json jsonb;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'beds' and column_name = 'queue') then
    alter table public.beds add column queue jsonb default '[]'::jsonb;
  end if;
end $$;

drop trigger if exists on_beds_updated on public.beds;
create trigger on_beds_updated before update on public.beds
  for each row execute procedure public.handle_updated_at();

insert into public.beds (id)
select generate_series(1, 11)
on conflict (id) do nothing;


-- =========================================================
-- 4. Table: Presets
-- =========================================================
create table if not exists public.presets (
  id text primary key,
  name text not null,
  steps jsonb not null,
  rank integer default 0,
  updated_at timestamptz default now()
);

-- Migration for presets columns
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'presets' and column_name = 'rank') then
    alter table public.presets add column rank integer default 0;
  end if;
end $$;

drop trigger if exists on_presets_updated on public.presets;
create trigger on_presets_updated before update on public.presets
  for each row execute procedure public.handle_updated_at();

-- Seed Presets (if empty)
insert into public.presets (id, name, steps, rank)
select 'basic-mix', '기본 물리치료', 
'[{"id": "s1", "name": "핫팩 (Hot Pack)", "color": "bg-red-500", "duration": 600, "enableTimer": true}, {"id": "s2", "name": "ICT", "color": "bg-blue-500", "duration": 600, "enableTimer": true}, {"id": "s3", "name": "Laser", "color": "bg-pink-500", "duration": 300, "enableTimer": true}]'::jsonb, 0
where not exists (select 1 from public.presets limit 1);

insert into public.presets (id, name, steps, rank)
select 'shoulder', '어깨 루틴', 
'[{"id": "s4", "name": "핫팩 (Hot Pack)", "color": "bg-red-500", "duration": 600, "enableTimer": true}, {"id": "s5", "name": "TENS", "color": "bg-green-500", "duration": 600, "enableTimer": true}, {"id": "s6", "name": "자기장 (Magnetic)", "color": "bg-purple-500", "duration": 600, "enableTimer": true}]'::jsonb, 1
where not exists (select 1 from public.presets where id = 'shoulder');

insert into public.presets (id, name, steps, rank)
select 'knee', '무릎 루틴', 
'[{"id": "s7", "name": "핫팩 (Hot Pack)", "color": "bg-red-500", "duration": 600, "enableTimer": true}, {"id": "s8", "name": "ICT", "color": "bg-blue-500", "duration": 600, "enableTimer": true}, {"id": "s9", "name": "초음파 (Ultra)", "color": "bg-gray-500", "duration": 300, "enableTimer": true}]'::jsonb, 2
where not exists (select 1 from public.presets where id = 'knee');

insert into public.presets (id, name, steps, rank)
select 'back', '허리 루틴', 
'[{"id": "s10", "name": "핫팩 (Hot Pack)", "color": "bg-red-500", "duration": 600, "enableTimer": true}, {"id": "s11", "name": "ICT", "color": "bg-blue-500", "duration": 600, "enableTimer": true}, {"id": "s12", "name": "자기장 (Magnetic)", "color": "bg-purple-500", "duration": 600, "enableTimer": true}]'::jsonb, 3
where not exists (select 1 from public.presets where id = 'back');


-- =========================================================
-- 5. Table: Quick Treatments
-- =========================================================
create table if not exists public.quick_treatments (
  id text primary key,
  name text not null,
  label text not null,
  duration integer not null, -- minutes
  color text not null,
  enable_timer boolean not null,
  rank integer default 0,
  updated_at timestamptz default now()
);

-- Migration for quick_treatments columns (Ensure rank exists)
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'quick_treatments' and column_name = 'rank') then
    alter table public.quick_treatments add column rank integer default 0;
  end if;
end $$;

drop trigger if exists on_quick_treatments_updated on public.quick_treatments;
create trigger on_quick_treatments_updated before update on public.quick_treatments
  for each row execute procedure public.handle_updated_at();

-- Seed Quick Treatments (if empty)
insert into public.quick_treatments (id, name, label, duration, color, enable_timer, rank)
values 
  ('qt-1', '핫팩 (Hot Pack)', 'HP', 10, 'bg-red-500', true, 0),
  ('qt-2', 'ICT', 'ICT', 10, 'bg-blue-500', true, 1),
  ('qt-3', 'TENS', 'TENS', 10, 'bg-green-500', true, 2),
  ('qt-4', 'Laser', 'Laser', 5, 'bg-pink-500', true, 3),
  ('qt-5', '자기장 (Magnetic)', 'Mg', 10, 'bg-purple-500', true, 4),
  ('qt-6', '적외선 (IR)', 'IR', 10, 'bg-red-500', true, 5),
  ('qt-7', '견인 (Traction)', '견인', 15, 'bg-orange-500', true, 6),
  ('qt-8', '충격파 (ESWT)', 'ESWT', 10, 'bg-blue-500', true, 7),
  ('qt-9', '이온치료 (ION)', 'ION', 10, 'bg-cyan-500', true, 8),
  ('qt-10', '공기압 (Air)', 'Air', 15, 'bg-gray-500', true, 9),
  ('qt-11', '냉치료 (Cryo)', 'Cryo', 5, 'bg-sky-500', true, 10),
  ('qt-12', '파라핀 (Paraffin)', 'Para', 10, 'bg-yellow-500', false, 11),
  ('qt-13', '초음파 (Ultra)', 'US', 5, 'bg-gray-500', true, 12),
  ('qt-14', '운동치료 (Exercise)', 'Ex', 10, 'bg-green-500', true, 13),
  ('qt-15', '도수치료 (Manual)', '도수', 10, 'bg-violet-500', true, 14)
on conflict (id) do nothing;


-- =========================================================
-- 6. Table: Patient Visits
-- =========================================================
create table if not exists public.patient_visits (
  id uuid default gen_random_uuid() primary key,
  visit_date date not null default current_date,
  bed_id integer,
  patient_name text,
  body_part text,
  treatment_name text,
  memo text,
  author text,
  is_injection boolean default false,
  is_fluid boolean default false,
  is_traction boolean default false,
  is_eswt boolean default false,
  is_manual boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migrations for patient_visits
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'patient_visits' and column_name = 'body_part') then
    alter table public.patient_visits add column body_part text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'patient_visits' and column_name = 'memo') then
    alter table public.patient_visits add column memo text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'patient_visits' and column_name = 'is_injection') then
    alter table public.patient_visits add column is_injection boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'patient_visits' and column_name = 'is_fluid') then
    alter table public.patient_visits add column is_fluid boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'patient_visits' and column_name = 'is_traction') then
    alter table public.patient_visits add column is_traction boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'patient_visits' and column_name = 'is_eswt') then
    alter table public.patient_visits add column is_eswt boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'patient_visits' and column_name = 'is_manual') then
    alter table public.patient_visits add column is_manual boolean default false;
  end if;
end $$;

drop trigger if exists on_visits_updated on public.patient_visits;
create trigger on_visits_updated before update on public.patient_visits
  for each row execute procedure public.handle_updated_at();

create index if not exists idx_patient_visits_date on public.patient_visits(visit_date);
create index if not exists idx_patient_visits_bed on public.patient_visits(visit_date, bed_id);
create index if not exists idx_beds_updated_at on public.beds(updated_at);


-- =========================================================
-- 7. RLS & Permissions
-- =========================================================
alter table public.beds enable row level security;
alter table public.presets enable row level security;
alter table public.quick_treatments enable row level security;
alter table public.patient_visits enable row level security;

drop policy if exists "Allow Public Access" on public.beds;
drop policy if exists "Allow Public Access Presets" on public.presets;
drop policy if exists "Allow Public Access Quick" on public.quick_treatments;
drop policy if exists "Allow Public Access Visits" on public.patient_visits;

create policy "Allow Public Access" on public.beds for all using (true) with check (true);
create policy "Allow Public Access Presets" on public.presets for all using (true) with check (true);
create policy "Allow Public Access Quick" on public.quick_treatments for all using (true) with check (true);
create policy "Allow Public Access Visits" on public.patient_visits for all using (true) with check (true);

grant all on table public.beds to anon, authenticated, service_role;
grant all on table public.presets to anon, authenticated, service_role;
grant all on table public.quick_treatments to anon, authenticated, service_role;
grant all on table public.patient_visits to anon, authenticated, service_role;


-- =========================================================
-- 8. Realtime Setup
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'beds') then
    alter publication supabase_realtime add table public.beds;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'presets') then
    alter publication supabase_realtime add table public.presets;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'quick_treatments') then
    alter publication supabase_realtime add table public.quick_treatments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'patient_visits') then
    alter publication supabase_realtime add table public.patient_visits;
  end if;
end $$;

alter table public.beds replica identity full;
alter table public.presets replica identity full;
alter table public.quick_treatments replica identity full;
alter table public.patient_visits replica identity full;
`;