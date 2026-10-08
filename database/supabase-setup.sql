-- ===========================================================
-- SUNNY / WEDDING INVITATION - SUPABASE SETUP
-- GitHub Pages + Supabase Free
-- ===========================================================

create extension if not exists pgcrypto;

-- -----------------------------
-- TABLES
-- -----------------------------
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text default 'We would be honored to celebrate this beautiful day with you.',
  invite_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_photos (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  invite_token text not null,
  storage_path text not null unique,
  filter_name text,
  created_at timestamptz not null default now()
);

-- -----------------------------
-- MAXIMUM 3 PHOTOS PER GUEST
-- -----------------------------
create or replace function public.limit_guest_to_three_photos()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.guest_photos
    where guest_id = new.guest_id
  ) >= 3 then
    raise exception 'Maximum of 3 photos allowed per guest';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_three_photos on public.guest_photos;

create trigger enforce_three_photos
before insert on public.guest_photos
for each row
execute function public.limit_guest_to_three_photos();

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.guests enable row level security;
alter table public.guest_photos enable row level security;

drop policy if exists "anon can read active guests" on public.guests;
create policy "anon can read active guests"
on public.guests
for select
to anon
using (active = true);

drop policy if exists "anon can insert own photos" on public.guest_photos;
create policy "anon can insert own photos"
on public.guest_photos
for insert
to anon
with check (
  exists (
    select 1
    from public.guests g
    where g.id = guest_id
      and g.invite_token = guest_photos.invite_token
      and g.active = true
  )
);

drop policy if exists "anon can read own photos" on public.guest_photos;
create policy "anon can read own photos"
on public.guest_photos
for select
to anon
using (
  exists (
    select 1
    from public.guests g
    where g.id = guest_id
      and g.invite_token = guest_photos.invite_token
      and g.active = true
  )
);

-- -----------------------------
-- GRANTS
-- -----------------------------
revoke all on table public.guests from anon;
revoke all on table public.guest_photos from anon;

grant select on table public.guests to anon;
grant select, insert on table public.guest_photos to anon;

-- -----------------------------
-- STORAGE POLICIES
-- IMPORTANT:
-- First create a PRIVATE bucket manually named:
-- wedding-photos
-- -----------------------------

drop policy if exists "wedding photo uploads" on storage.objects;
create policy "wedding photo uploads"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'wedding-photos'
);

drop policy if exists "wedding photo reads" on storage.objects;
create policy "wedding photo reads"
on storage.objects
for select
to anon
using (
  bucket_id = 'wedding-photos'
);


alter table public.guests
  add column if not exists reservation_number text,
  add column if not exists table_number integer,
  add column if not exists seat_number integer;

alter table public.guests drop constraint if exists guests_table_number_check;
alter table public.guests add constraint guests_table_number_check
check (table_number is null or table_number between 1 and 5);

alter table public.guests drop constraint if exists guests_seat_number_check;
alter table public.guests add constraint guests_seat_number_check
check (seat_number is null or seat_number between 1 and 10);
