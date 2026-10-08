-- Run this ONCE in Supabase SQL Editor for your existing database.

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

-- Example for Anna:
-- update public.guests
-- set reservation_number='R-017', table_number=2, seat_number=7
-- where name='Anna Santos';

notify pgrst, 'reload schema';
