-- Public, exact-name availability check used before MotionC signup.
-- It intentionally returns only a boolean and does not expose profile rows.
create or replace function public.motionc_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    candidate is not null
    and char_length(candidate) between 3 and 24
    and candidate ~ '^[A-Za-z0-9_]+$'
    and not exists (
      select 1
      from public.motionc_profiles p
      where lower(p.display_name) = lower(candidate)
    );
$$;

revoke all on function public.motionc_username_available(text) from public;
grant execute on function public.motionc_username_available(text) to anon, authenticated;

comment on function public.motionc_username_available(text) is
  'Returns exact-name availability for the public MotionC username chosen during signup.';
