-- Revision (CAS) counter for the building snapshot + admin role.
--
-- building_state.revision: bumped on every write so stale clients can't
-- overwrite a newer snapshot. 0 = nothing written yet.
--
-- "user".role: replaces the hard-coded admin email check; assertAdmin now
-- requires role = 'admin'. On a fresh install the first account to sign up is
-- promoted by the app itself (src/lib/admin.server.ts) — no email is baked in.

alter table building_state
  add column if not exists revision bigint not null default 0;

alter table "user"
  add column if not exists role text not null default 'member';
