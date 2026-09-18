// Pure snapshot/fee validation shared by the server writer (building.server.ts)
// and node tests. Kept free of DB imports so tests don't touch a database.
import { DEFAULT_SETTINGS } from "@/lib/store";

/** Numeric, finite, non-negative integer required — else 0. */
export function validateFee(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  const int = Math.round(n);
  return int >= 0 && Math.abs(n - int) < 1e-9 ? int : 0;
}

export function validateSnapshot(input: {
  units?: unknown;
  charges?: unknown;
  payments?: unknown;
  expenses?: unknown;
  settings?: Partial<Record<keyof typeof DEFAULT_SETTINGS, unknown>>;
}) {
  const settings = { ...DEFAULT_SETTINGS, ...input.settings } as Record<string, unknown>;
  return {
    units: Array.isArray(input.units) ? input.units : [],
    charges: Array.isArray(input.charges) ? input.charges : [],
    payments: Array.isArray(input.payments) ? input.payments : [],
    expenses: Array.isArray(input.expenses) ? input.expenses : [],
    settings: {
      ...settings,
      buildingName: String(settings.buildingName ?? "").slice(0, 100),
      address: String(settings.address ?? "").slice(0, 300),
      manager: String(settings.manager ?? "").slice(0, 100),
      cardNumber: String(settings.cardNumber ?? "").slice(0, 32),
      bank: String(settings.bank ?? "").slice(0, 100),
      baseCharge: validateFee(settings.baseCharge),
      perPerson: validateFee(settings.perPerson),
      previousManagerReceivable: validateFee(settings.previousManagerReceivable),
    },
  };
}
