-- Money actually received back from whoever was holding it (e.g. a previous
-- manager finally handing over funds owed to this building). A proper
-- top-level list, alongside units/charges/payments/expenses — real income,
-- counted in fundBalance, distinct from a `pendingHandover`-flagged payment
-- (money a resident paid that hasn't reached this treasury yet).

alter table building_state
  add column if not exists handover_receipts jsonb not null default '[]'::jsonb;
