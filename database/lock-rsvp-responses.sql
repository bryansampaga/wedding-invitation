-- Run this ONCE in the Supabase SQL Editor for an existing wedding database.
-- It makes each guest's first submitted RSVP permanent.

create or replace function public.submit_guest_rsvp(
  p_invite_token text,
  p_status text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'Invalid RSVP status';
  end if;

  if p_note is not null and char_length(trim(p_note)) > 500 then
    raise exception 'RSVP note is too long';
  end if;

  update public.guests
  set
    rsvp_status = p_status,
    rsvp_note = nullif(trim(p_note), ''),
    rsvp_responded_at = now()
  where invite_token = p_invite_token
    and active = true
    and rsvp_status = 'pending';

  return found;
end;
$$;

revoke all on function public.submit_guest_rsvp(text, text, text) from public;
grant execute on function public.submit_guest_rsvp(text, text, text) to anon;

notify pgrst, 'reload schema';
