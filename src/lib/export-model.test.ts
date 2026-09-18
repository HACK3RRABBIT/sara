import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildExportModel,
  activeMonths,
  formatAmount,
  sanitizeFileName,
} from "./export-model.ts";
import { monthDebt, totalDebt, fundBalanceThrough, monthTotals } from "./building-core.ts";
import type { BuildingSnapshot } from "./building-core.ts";
import { validateFee, validateSnapshot } from "./building-validate.ts";

const defaults = {
  buildingName: "سرا",
  address: "",
  manager: "",
  cardNumber: "",
  bank: "",
  baseCharge: 1_500_000,
  perPerson: 100_000,
  previousManagerReceivable: 0,
};

function snapshot(over: Partial<BuildingSnapshot> = {}): BuildingSnapshot {
  return {
    units: [],
    charges: [],
    payments: [],
    expenses: [],
    settings: defaults,
    ...over,
  };
}

describe("activeMonths", () => {
  it("includes expense-only and payment-only months", () => {
    const snap = snapshot({
      charges: [{ id: "c1", unitId: "u1", year: 1404, month: 5, amount: 100, note: "", issuedAt: "" }],
      payments: [{ id: "p1", unitId: "u1", year: 1404, month: 6, amount: 100, method: "cash", date: "", note: "" }],
      expenses: [{ id: "e1", title: "آب", category: "water", amount: 50, date: "2025-08-05", vendor: "", note: "" }],
    });
    const months = activeMonths(snap);
    const keys = months.map(({ year, month }) => `${year}-${month}`);
    assert.ok(keys.includes("1404-5"));
    assert.ok(keys.includes("1404-6"));
    // expense date -> jalal month of 2025-08-05 = مرداد ۱۴۰۴ (still 1404-5), dedup fine
    assert.equal(new Set(keys).size, months.length);
  });
});

describe("debt totals", () => {
  it("sum per-charge remaining so overpayment on one unit cannot cancel another debt", () => {
    const snap = snapshot({
      units: [
        { id: "u1", number: "۱", floor: 1, occupants: 1, resident: "A", phone: "", occupied: true, note: "" },
        { id: "u2", number: "۲", floor: 1, occupants: 1, resident: "B", phone: "", occupied: true, note: "" },
      ],
      charges: [
        { id: "c1", unitId: "u1", year: 1404, month: 1, amount: 1_000_000, note: "", issuedAt: "" },
        { id: "c2", unitId: "u2", year: 1404, month: 1, amount: 1_000_000, note: "", issuedAt: "" },
      ],
      // u1 overpaid by 500k — must not shrink u2's debt in totals.
      payments: [{ id: "p1", unitId: "u1", year: 1404, month: 1, amount: 1_500_000, method: "cash", date: "", note: "" }],
    });
    assert.equal(monthDebt(snap, 1404, 1), 1_000_000);
    assert.equal(totalDebt(snap), 1_000_000);
  });
});

describe("buildExportModel", () => {
  it("produces numeric amounts and string cells, summary covers all months", () => {
    const snap = snapshot({
      units: [
        { id: "u1", number: "۱", floor: 1, occupants: 2, resident: "سارا", phone: "0912", occupied: true, note: "یادداشت" },
      ],
      charges: [{ id: "c1", unitId: "u1", year: 1404, month: 3, amount: 1_700_000, note: "شارژ", issuedAt: "2025-06-24" }],
      payments: [{ id: "p1", unitId: "u1", year: 1404, month: 3, amount: 800_000, method: "card", date: "2025-06-25", note: "" }],
      expenses: [{ id: "e1", title: "برق", category: "electricity", amount: 200_000, date: "2025-06-20", vendor: "", note: "" }],
      settings: { ...defaults, baseCharge: 1_500_000, perPerson: 100_000 },
    });
    const model = buildExportModel(snap, { generatedAt: new Date("2025-09-01") });

    assert.deepEqual(model.sheetOrder.length, Object.keys(model.sheets).length);

    const summary = model.sheets["خلاصه ماهانه"];
    const [row] = summary.rows;
    assert.ok(row.every((cell) => typeof cell === "number" || typeof cell === "string"));
    assert.equal(typeof row[1], "number"); // billed numeric
    assert.notEqual(String(row[0]).startsWith("="), true); // no formula-like cells

    const units = model.sheets["واحدها"].rows;
    // base 1.5m + 2 persons * 100k = 1.7m numeric
    assert.equal(units[0][8], 1_700_000);

    const charges = model.sheets["شارژها"].rows;
    assert.equal(charges[0][4], 1_700_000);
    assert.equal(typeof charges[0][3], "string"); // Persian month title

    const totals = monthTotals(snap, 1404, 3);
    assert.equal(totals.billed, 1_700_000);
    assert.equal(totals.collected, 800_000);
    assert.equal(monthDebt(snap, 1404, 3), 900_000);
    assert.equal(fundBalanceThrough(snap, 1404, 3), 800_000 - 200_000);
    assert.equal(formatAmount(1700000), "۱٬۷۰۰٬۰۰۰");
  });

  it("fileName is safe", () => {
    assert.equal(sanitizeFileName('سرا: "x" / y?'), "سرا-x-y");
    const model = buildExportModel(snapshot(), { generatedAt: new Date() });
    assert.match(model.fileName, /\.xlsx$/);
    assert.ok(!/[\\/:*?"<>|]/.test(model.fileName));
  });
});

describe("validateFee / validateSnapshot", () => {
  it("accepts safe non-negative integers and coerces numeric strings", () => {
    assert.equal(validateFee(1500000), 1500000);
    assert.equal(validateFee("1500000"), 1500000);
    assert.equal(validateFee(0), 0);
  });
  it("rejects negatives, non-integers, NaN/Infinity", () => {
    assert.equal(validateFee(-5), 0);
    assert.equal(validateFee(10.5), 0);
    assert.equal(validateFee(Number.NaN), 0);
    assert.equal(validateFee(Number.POSITIVE_INFINITY), 0);
    assert.equal(validateFee(""), 0);
    assert.equal(validateFee(null), 0);
  });
  it("validateSnapshot clamps fees on write", () => {
    const clean = validateSnapshot({
      units: [],
      charges: [],
      payments: [],
      expenses: [],
      settings: { ...defaults, baseCharge: -10, perPerson: 3.7 },
    });
    assert.equal(clean.settings.baseCharge, 0);
    assert.equal(clean.settings.perPerson, 0);
  });
});
