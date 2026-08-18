-- MotionC identity-free search-interest analytics.
create table if not exists public.site_search_events (
  id bigint generated always as identity primary key,
  searched_at timestamptz not null default now(),
  area text not null default 'library' check (area in ('library')),
  query text not null check (char_length(query) between 2 and 100),
  results_count smallint not null check (results_count between 0 and 32767)
);

alter table public.site_search_events enable row level security;
revoke all on table public.site_search_events from anon, authenticated;
grant insert on table public.site_search_events to anon, authenticated;
grant select on table public.site_search_events to authenticated;

create policy "site may append identity-free searches"
on public.site_search_events for insert to anon, authenticated
with check (
  area = 'library'
  and char_length(query) between 2 and 100
  and query !~* '[[:alnum:]._%+-]+@[[:alnum:].-]+[.][[:alpha:]]{2,}'
  and query !~ '[0-9][0-9 ()+.-]{5,}[0-9]'
);

create policy "owner may read search analytics"
on public.site_search_events for select to authenticated
using (((select auth.jwt())->'app_metadata'->>'role') = 'owner');

create index site_search_events_searched_at_idx
on public.site_search_events (searched_at desc);

create index site_search_events_query_idx
on public.site_search_events (query, searched_at desc);
