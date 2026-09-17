-- Building ledger: one JSON document so a 10-unit building stays simple to back up.
create table if not exists building_state (
  id text primary key,
  units jsonb not null default '[]'::jsonb,
  charges jsonb not null default '[]'::jsonb,
  payments jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
