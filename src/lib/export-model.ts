// Pure, library-agnostic export model. Decides *what* appears in the workbook
// (sheets, headers, rows as plain cells — numbers stay numbers, text stays
// text) and nothing about *how* it becomes an .xlsx. The ExcelJS adapter in
// `excel-export.ts` consumes it; node tests in `export-model.test.mjs` pin the
// numbers.

import {
  EXPENSE_LABELS,
  METHOD_LABELS,
  STATUS_LABELS,
  expenseMonth,
  fromMonthKey,
  fundBalance,
  fundBalanceThrough,
  getRemaining,
  getPaid,
  getStatus,
  monthDebt,
  monthKey,
  monthTotals,
  totalDebt,
  type BuildingSnapshot,
  type Charge,
  type Expense,
  type Payment,
  type PayStatus,
  type Unit,
} from "@/lib/building-core";
import { faNum, formatFaDate, isoToJalali, monthTitle } from "@/lib/format";

export type Cell = string | number;
export type Row = Cell[];

export type SheetSpec = {
  name: string;
  columns: { header: string; width?: number }[];
  rows: Row[];
};

export type ExportSummary = {
  building: string;
  generatedAtFa: string;
  months: number;
  totalDebt: number;
  fund: number;
  units: number;
  charges: number;
  payments: number;
  expenses: number;
};

export type ExportModel = {
  fileName: string;
  sheetOrder: string[];
  sheets: Record<string, SheetSpec>;
  summary: ExportSummary;
};

/** Months present in ANY dataset — charges, payments, or expenses alike. */
export function activeMonths(snapshot: BuildingSnapshot): Array<{ year: number; month: number }> {
  const keys = new Set<number>();
  for (const charge of snapshot.charges) keys.add(monthKey(charge.year, charge.month));
  for (const payment of snapshot.payments) keys.add(monthKey(payment.year, payment.month));
  for (const expense of snapshot.expenses) {
    const j = expenseMonth(expense);
    keys.add(monthKey(j.year, j.month));
  }
  return [...keys]
    .sort((a, b) => a - b)
    .map(fromMonthKey);
}

const t = (date: string | undefined) => (date ? formatFaDate(date) : "");

const faInt = (n: number) => faNum(Math.round(n));

export function buildExportModel(
  snapshot: BuildingSnapshot,
  opts: { generatedAt?: Date } = {},
): ExportModel {
  const now = opts.generatedAt ?? new Date();
  const months = activeMonths(snapshot);
  const settings = snapshot.settings;

  const statusOf = (charge: Charge): PayStatus =>
    getStatus(snapshot, charge.unitId, charge.year, charge.month);

  // ---- خلاصه (summary) -------------------------------------------------
  const summaryRows: Row[] = months.map(({ year, month }) => {
    const totals = monthTotals(snapshot, year, month);
    return [
      monthTitle(year, month),
      totals.billed,
      totals.collected,
      monthDebt(snapshot, year, month),
      totals.spent,
      fundBalanceThrough(snapshot, year, month),
    ];
  });
  const summarySheet: SheetSpec = {
    name: "خلاصه ماهانه",
    columns: [
      { header: "ماه", width: 16 },
      { header: "شارژ صادرشده (تومان)" },
      { header: "وصول‌شده (تومان)" },
      { header: "مانده بدهی (تومان)" },
      { header: "هزینه‌ها (تومان)" },
      { header: "موجودی صندوق تا این ماه (تومان)" },
    ],
    rows: summaryRows,
  };

  // ---- واحدها ----------------------------------------------------------
  const unitsSheet: SheetSpec = {
    name: "واحدها",
    columns: [
      { header: "شناسه" },
      { header: "شماره واحد" },
      { header: "طبقه" },
      { header: "تعداد نفرات" },
      { header: "ساکن" },
      { header: "تلفن" },
      { header: "مسکونی" },
      { header: "یادداشت" },
      { header: "شارژ ماهانه (تومان)" },
    ],
    rows: snapshot.units.map((unit: Unit) => [
      unit.id,
      unit.number,
      unit.floor,
      unit.occupants,
      unit.resident,
      unit.phone,
      unit.occupied ? "مسکونی" : "خالی",
      unit.note,
      settings.baseCharge + Math.max(0, unit.occupants) * settings.perPerson,
    ]),
  };

  // ---- شارژها ----------------------------------------------------------
  const chargesSheet: SheetSpec = {
    name: "شارژها",
    columns: [
      { header: "شناسه" },
      { header: "شناسه واحد" },
      { header: "واحد" },
      { header: "ماه" },
      { header: "مبلغ (تومان)" },
      { header: "توضیح" },
      { header: "تاریخ صدور" },
      { header: "وضعیت" },
    ],
    rows: snapshot.charges.map((charge: Charge) => {
      const unit = snapshot.units.find((u) => u.id === charge.unitId);
      return [
        charge.id,
        charge.unitId,
        unit?.number ?? "",
        monthTitle(charge.year, charge.month),
        charge.amount,
        charge.note,
        t(charge.issuedAt),
        STATUS_LABELS[statusOf(charge)],
      ];
    }),
  };

  // ---- پرداخت‌ها -------------------------------------------------------
  const paymentsSheet: SheetSpec = {
    name: "پرداخت‌ها",
    columns: [
      { header: "شناسه" },
      { header: "شناسه واحد" },
      { header: "واحد" },
      { header: "ماه" },
      { header: "مبلغ (تومان)" },
      { header: "روش" },
      { header: "تاریخ (شمسی)" },
      { header: "توضیح" },
    ],
    rows: snapshot.payments.map((payment: Payment) => {
      const unit = snapshot.units.find((u) => u.id === payment.unitId);
      return [
        payment.id,
        payment.unitId,
        unit?.number ?? "",
        monthTitle(payment.year, payment.month),
        payment.amount,
        METHOD_LABELS[payment.method],
        t(payment.date),
        payment.note,
      ];
    }),
  };

  // ---- هزینه‌ها --------------------------------------------------------
  const expensesSheet: SheetSpec = {
    name: "هزینه‌ها",
    columns: [
      { header: "شناسه" },
      { header: "عنوان" },
      { header: "دسته" },
      { header: "مبلغ (تومان)" },
      { header: "تاریخ (شمسی)" },
      { header: "پرداخت‌کننده / فروشنده" },
      { header: "توضیح" },
    ],
    rows: snapshot.expenses.map((expense: Expense) => [
      expense.id,
      expense.title,
      EXPENSE_LABELS[expense.category],
      expense.amount,
      t(expense.date),
      expense.vendor,
      expense.note,
    ]),
  };

  // ---- گزارش واحدها (دِین) --------------------------------------------
  const reportsSheet: SheetSpec = {
    name: "گزارش واحدها",
    columns: [
      { header: "واحد" },
      { header: "ساکن" },
      { header: "ماه" },
      { header: "شارژ (تومان)" },
      { header: "پرداخت (تومان)" },
      { header: "مانده (تومان)" },
      { header: "وضعیت" },
    ],
    rows: months.flatMap(({ year, month }) =>
      snapshot.units.map((unit: Unit) => {
        const charge = snapshot.charges.find(
          (c) => c.unitId === unit.id && c.year === year && c.month === month,
        );
        return [
          unit.number,
          unit.resident,
          monthTitle(year, month),
          charge ? charge.amount : 0,
          getPaid(snapshot, unit.id, year, month),
          charge
            ? getRemaining(snapshot, unit.id, year, month)
            : 0,
          STATUS_LABELS[getStatus(snapshot, unit.id, year, month)],
        ];
      }),
    ),
  };

  // ---- صندوق -----------------------------------------------------------
  const fundSheet: SheetSpec = {
    name: "صندوق",
    columns: [
      { header: "کل وصولی (تومان)" },
      { header: "کل هزینه (تومان)" },
      { header: "موجودی صندوق (تومان)" },
    ],
    rows: [
      [
        snapshot.payments.reduce((s, p) => s + p.amount, 0),
        snapshot.expenses.reduce((s, e) => s + e.amount, 0),
        fundBalance(snapshot),
      ],
    ],
  };

  const sheets = {
    "خلاصه ماهانه": summarySheet,
    "گزارش واحدها": reportsSheet,
    "واحدها": unitsSheet,
    "شارژها": chargesSheet,
    "پرداخت‌ها": paymentsSheet,
    "هزینه‌ها": expensesSheet,
    "صندوق": fundSheet,
  };
  const sheetOrder = [
    "خلاصه ماهانه",
    "گزارش واحدها",
    "واحدها",
    "شارژها",
    "پرداخت‌ها",
    "هزینه‌ها",
    "صندوق",
  ];

  return {
    fileName: `${sanitizeFileName(settings.buildingName) || "سرا"}-${faDateStamp(now)}.xlsx`,
    sheetOrder,
    sheets,
    summary: {
      building: settings.buildingName,
      generatedAtFa: formatFaDate(now.toISOString()),
      totalDebt: totalDebt(snapshot),
      fund: fundBalance(snapshot),
      months: months.length,
      charges: snapshot.charges.length,
      payments: snapshot.payments.length,
      expenses: snapshot.expenses.length,
      units: snapshot.units.length,
    },
  };
}

export function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, " ").trim().replace(/\s+/g, "-");
}

function faDateStamp(date: Date) {
  const j = isoToJalali(date.toISOString());
  return `${j.year}-${j.month}-${j.day}`;
}

// (kept for shared use in UI text / debug)
export function formatAmount(n: number) {
  return faInt(n);
}
