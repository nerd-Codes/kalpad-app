alter table public.generated_notes
add column if not exists highlights jsonb not null default '[]'::jsonb;

comment on column public.generated_notes.highlights is 'Structured rendered-range highlights persisted for cross-device note viewing.';
