-- Money the current manager personally took out of the fund and repayments
-- made back into it. Distinct from handover_receipts (money owed by a
-- previous manager) so the two debts are never shown mixed together.

alter table building_state
  add column if not exists manager_repayments jsonb not null default '[]'::jsonb;
