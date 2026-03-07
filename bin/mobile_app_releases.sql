-- Run once in Supabase SQL editor.
-- Stores release metadata consumed by /api/mobile/android/latest

create table if not exists public.mobile_app_releases (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('android', 'ios')),
  latest_version_code integer not null,
  latest_version_name text not null,
  min_supported_version_code integer not null,
  mandatory boolean not null default false,
  apk_url text not null,
  sha256 text,
  release_notes jsonb not null default '[]'::jsonb,
  released_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mobile_app_releases_platform_active
  on public.mobile_app_releases (platform, is_active, released_at desc);

-- Optional: keep updated_at fresh automatically.
create or replace function public.touch_mobile_app_releases_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_mobile_app_releases_updated_at on public.mobile_app_releases;
create trigger trg_mobile_app_releases_updated_at
before update on public.mobile_app_releases
for each row execute function public.touch_mobile_app_releases_updated_at();

-- Example seed row (update values each release):
insert into public.mobile_app_releases (
  platform,
  latest_version_code,
  latest_version_name,
  min_supported_version_code,
  mandatory,
  apk_url,
  sha256,
  release_notes,
  released_at,
  is_active
) values (
  'android',
  1,
  '1.0.0',
  1,
  false,
  'https://kalpad-app.vercel.app/downloads/kalpad-latest.apk',
  null,
  '["Initial release"]'::jsonb,
  now(),
  true
);

-- Keep only the newest row active:
-- update public.mobile_app_releases set is_active = false where platform = 'android';
-- update public.mobile_app_releases set is_active = true where id = '...';

