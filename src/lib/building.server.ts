import { getSql } from "@/lib/db";
import type { Charge, Expense, HandoverReceipt, Payment, Settings, Unit } from "@/lib/store";
import { DEFAULT_SETTINGS, type BuildingSnapshot } from "@/lib/store";
import { validateFee, validateSnapshot } from "@/lib/building-validate";

export const EMPTY_SETTINGS: Settings = { ...DEFAULT_SETTINGS };
export const EMPTY_SNAPSHOT: BuildingSnapshot = {
  units: [],
  charges: [],
  payments: [],
  expenses: [],
  handoverReceipts: [],
  settings: { ...DEFAULT_SETTINGS },
};

export { validateFee, validateSnapshot };

// ---- Auth ----------------------------------------------------------------
// Role-based: the admin role is granted by the parent's role migration
// (0004_building_revision.sql promotes the bootstrap admin email to "admin").
// The old hard-coded email check is gone so any admin (not just that address)
// can manage the building.
export async function hasAdminRole(userId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ role: string }>`select role from "user" where id = ${userId} limit 1`;
  return rows[0]?.role === "admin";
}

export async function assertAdmin(userId: string) {
  if (!(await hasAdminRole(userId))) {
    throw new Error("Forbidden");
  }
}

// ---- Snapshot store with CAS revision ------------------------------------
//
// Every write carries the revision it was based on. If the DB row has moved on
// (another tab/session saved first), the stale write is refused instead of
// silently overwriting — the client then rehydrates. The revision counter is
// added by migration 0004_building_revision.sql.

export type SaveResult = { ok: true; revision: number } | { ok: false; revision: number };

export type SaveInput = {
  data: BuildingSnapshot;
  /** Client's known revision; omit for a first ever write. */
  baseRevision?: number;
};

export const CURRENT_REVISION_FALLBACK = 0;

export async function readBuilding(): Promise<BuildingSnapshot> {
  const sql = await getSql();
  const rows = await sql<{
    units: unknown;
    charges: unknown;
    payments: unknown;
    expenses: unknown;
    handover_receipts: unknown;
    settings: unknown;
  }>`select units, charges, payments, expenses, handover_receipts, settings from building_state where id = ${"default"} limit 1`;
  const row = rows[0];
  if (!row) return EMPTY_SNAPSHOT;
  const settings = {
    ...EMPTY_SETTINGS,
    ...parseJson<Partial<Settings>>(row.settings, {}),
  };
  return validateSnapshot({
    units: parseJson<Unit[]>(row.units, []),
    charges: parseJson<Charge[]>(row.charges, []),
    payments: parseJson<Payment[]>(row.payments, []),
    expenses: parseJson<Expense[]>(row.expenses, []),
    handoverReceipts: parseJson<HandoverReceipt[]>(row.handover_receipts, []),
    settings,
  });
}

export async function writeBuilding(
  snapshot: BuildingSnapshot,
  baseRevision?: number,
): Promise<SaveResult> {
  const sql = await getSql();
  const clean = validateSnapshot(snapshot);
  const revision = await ensureRevision(sql);

  // Compare-and-swap: refuse when the row moved since the client last read it.
  const conflict = baseRevision != null && baseRevision !== revision;
  if (conflict) {
    return { ok: false, revision };
  }

  const nextRevision = revision + 1;
  await sql.query(
    `insert into building_state (id, units, charges, payments, expenses, handover_receipts, settings, revision, updated_at)
     values ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, now())
     on conflict (id) do update set
       units = excluded.units,
       charges = excluded.charges,
       payments = excluded.payments,
       expenses = excluded.expenses,
       handover_receipts = excluded.handover_receipts,
       settings = excluded.settings,
       revision = excluded.revision,
       updated_at = now()`,
    [
      "default",
      JSON.stringify(clean.units),
      JSON.stringify(clean.charges),
      JSON.stringify(clean.payments),
      JSON.stringify(clean.expenses),
      JSON.stringify(clean.handoverReceipts),
      JSON.stringify(clean.settings),
      nextRevision,
    ],
  );
  return { ok: true, revision: nextRevision };
}

async function ensureRevision(sql: Awaited<ReturnType<typeof getSql>>): Promise<number> {
  const rows = await sql.query<{ revision: unknown }>(
    "select revision from building_state where id = $1 limit 1",
    ["default"],
  );
  return Number(rows[0]?.revision ?? CURRENT_REVISION_FALLBACK);
}

export async function readRevision(): Promise<number> {
  const sql = await getSql();
  return ensureRevision(sql);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}
