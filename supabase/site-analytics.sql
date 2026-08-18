-- MotionC privacy-limited visit analytics. No health or personally identifying fields.
create table if not exists public.site_analytics_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  visitor_id uuid not null,
  session_id uuid not null,
  event_type text not null check (event_type in ('session_start','page_view','heartbeat')),
  path text not null check (char_length(path) between 1 and 500),
  page_title text check (page_title is null or char_length(page_title) <= 200),
  entry_path text not null check (char_length(entry_path) between 1 and 500),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 255),
  is_registered boolean not null default false,
  active_seconds smallint not null default 0 check (active_seconds between 0 and 30),
  device_class text check (device_class in ('phone','tablet','desktop')),
  utm_source text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 150)
);

alter table public.site_analytics_events enable row level security;
revoke all on table public.site_analytics_events from anon, authenticated;
grant insert on table public.site_analytics_events to anon, authenticated;
grant select on table public.site_analytics_events to authenticated;

create policy "public may append anonymous analytics"
on public.site_analytics_events for insert to anon
with check (is_registered = false);

create policy "members may append registered analytics"
on public.site_analytics_events for insert to authenticated
with check (is_registered = true);

create policy "owner may read analytics"
on public.site_analytics_events for select to authenticated
using (((select auth.jwt())->'app_metadata'->>'role') = 'owner');

create index site_analytics_events_occurred_at_idx on public.site_analytics_events (occurred_at desc);
create index site_analytics_events_session_idx on public.site_analytics_events (session_id, occurred_at);
create index site_analytics_events_pageviews_idx on public.site_analytics_events (path, occurred_at desc) where event_type = 'page_view';
