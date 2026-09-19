// Pure building selectors + labels — no React, no zustand, no path aliases.
// `src/lib/store.ts` re-exports these (routes keep importing from "@/lib/store")
// so the export model and its node tests can depend on the exact same numbers
// the UI shows.

import {
  isOverdueMonth,
  inPayWindow,
  isoToJalali,
  monthTitle,
  type JalaliDate,
} from "@/lib/format";

export type PaymentMethod = "card" | "cash" | "transfer";
export type ExpenseCategory =
  | "cleaning"
  | "elevator"
  | "electricity"
  | "water"
  | "repair"
  | "garden"
  | "insurance"
  | "other";

export type PayStatus = "paid" | "partial" | "window" | "upcoming" | "overdue" | "none";

export type Unit = {
  id: string;
  number: string;
  floor: number;
  occupants: number;
  resident: string;
  phone: string;
  occupied: boolean;
  note: string;
};

export type Charge = {
  id: string;
  unitId: string;
  year: number;
  month: number;
  amount: number;
  note: string;
  issuedAt: string;
};

export type Payment = {
  id: string;
  unitId: string;
  year: number;
  month: number;
  amount: number;
  method: PaymentMethod;
  date: string;
  note: string;
  /**
   * The resident paid, but the money isn't in this building's treasury yet —
   * e.g. paid to a previous manager who hasn't handed it over. Counts toward
   * the unit's paid/remaining status (the resident isn't a debtor), but is
   * excluded from `fundBalance`/`fundBalanceThrough` (not real cash on hand
   * yet). Clear it once the money is actually received.
   */
  pendingHandover?: boolean;
};

/** Money actually received back from whoever was holding it (e.g. the
 * previous manager finally handing over funds). Real income — counted in
 * `fundBalance`, unlike a `pendingHandover` payment. Recording one also
 * reduces `Settings.previousManagerReceivable` by the same amount, so the
 * two numbers (what's still outstanding vs. what's actually in the
 * treasury) never have to be kept in sync by hand. */
export type HandoverReceipt = {
  id: string;
  amount: number;
  date: string;
  note: string;
};

/** A repayment the *current* manager makes back into the fund, after having
 * taken money out of it personally (tracked via `Settings.managerDebtToFund`).
 * Recording one reduces `managerDebtToFund` by the same amount — that
 * reduction alone is what restores `fundBalance`, so the repayment itself is
 * not separately added as income (that would double-count it). Kept as its
 * own list — distinct from `HandoverReceipt` — purely so the two debts (an
 * outside previous manager vs. the current manager) are never shown mixed
 * together. */
export type ManagerRepayment = {
  id: string;
  amount: number;
  date: string;
  note: string;
};

export type Expense = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  vendor: string;
  note: string;
};

export type Settings = {
  buildingName: string;
  address: string;
  manager: string;
  cardNumber: string;
  bank: string;
  baseCharge: number;
  perPerson: number;
  /** Money residents already paid that hasn't reached this treasury yet —
   * e.g. still held by a previous manager. A running estimate you edit
   * yourself; shown on the dashboard, excluded from the actual fund balance. */
  previousManagerReceivable: number;
  /** Money the *current* manager has personally taken out of the fund and
   * still owes back. Unlike `previousManagerReceivable` (money that never
   * reached the fund, so it's excluded from `fundBalance`), this money WAS
   * in the fund and physically left — so it's subtracted from `fundBalance`
   * the moment you raise it, and a `ManagerRepayment` lowers it again. A
   * running total you edit yourself. */
  managerDebtToFund: number;
};

export type SeedSlice = {
  units: Unit[];
  charges: Charge[];
  payments: Payment[];
  expenses: Expense[];
  handoverReceipts: HandoverReceipt[];
  managerRepayments: ManagerRepayment[];
  settings: Settings;
};

export type BuildingSnapshot = SeedSlice;

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  cleaning: "نظافت",
  elevator: "آسانسور",
  electricity: "برق مشاع",
  water: "آب مشاع",
  repair: "تعمیرات",
  garden: "فضای سبز",
  insurance: "بیمه",
  other: "متفرقه",
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "کارت‌به‌کارت",
  cash: "نقد",
  transfer: "پایا / حساب",
};

export const STATUS_LABELS: Record<PayStatus, string> = {
  paid: "تسویه‌شده",
  partial: "پرداخت ناقص",
  window: "مهلت پرداخت",
  upcoming: "مانده تا ۲۵",
  overdue: "معوق",
  none: "صادر نشده",
};

export function monthKey(year: number, month: number) {
  return year * 12 + month;
}

export function fromMonthKey(key: number) {
  return { year: Math.floor(key / 12), month: key % 12 || 12 };
}

export function expenseMonth(expense: Expense): JalaliDate {
  return isoToJalali(expense.date);
}

export function getCharge(state: SeedSlice, unitId: string, year: number, month: number) {
  return state.charges.find(
    (charge) => charge.unitId === unitId && charge.year === year && charge.month === month,
  );
}

export function getPaid(state: SeedSlice, unitId: string, year: number, month: number) {
  return state.payments
    .filter((payment) => payment.unitId === unitId && payment.year === year && payment.month === month)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function getRemaining(state: SeedSlice, unitId: string, year: number, month: number) {
  const charge = getCharge(state, unitId, year, month);
  if (!charge) return 0;
  return Math.max(0, charge.amount - getPaid(state, unitId, year, month));
}

export function getStatus(
  state: SeedSlice,
  unitId: string,
  year: number,
  month: number,
  today = jalaliTodayOf(),
): PayStatus {
  const charge = getCharge(state, unitId, year, month);
  if (!charge) return "none";
  const paid = getPaid(state, unitId, year, month);
  if (paid >= charge.amount) return "paid";
  if (isOverdueMonth(year, month, today)) return "overdue";
  if (year === today.year && month === today.month && inPayWindow(year, month, today.day)) {
    return paid > 0 ? "partial" : "window";
  }
  if (paid > 0) return "partial";
  return "upcoming";
}

function jalaliTodayOf() {
  return isoToJalali(new Date().toISOString());
}

export function monthTotals(state: SeedSlice, year: number, month: number) {
  const charges = state.charges.filter((charge) => charge.year === year && charge.month === month);
  const billed = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const collected = state.payments
    .filter((payment) => payment.year === year && payment.month === month)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const spent = state.expenses
    .filter((expense) => {
      const j = expenseMonth(expense);
      return j.year === year && j.month === month;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
  return { billed, collected, spent, outstanding: Math.max(0, billed - collected) };
}

export function monthDebt(state: SeedSlice, year: number, month: number) {
  // Per-charge remaining — an overpayment on one unit must never cancel
  // another unit's debt in the totals.
  return state.charges
    .filter((charge) => charge.year === year && charge.month === month)
    .reduce((sum, charge) => sum + getRemaining(state, charge.unitId, year, month), 0);
}

export function unitDebt(state: SeedSlice, unitId: string) {
  return state.charges
    .filter((charge) => charge.unitId === unitId)
    .reduce((sum, charge) => sum + getRemaining(state, unitId, charge.year, charge.month), 0);
}

export function totalDebt(state: SeedSlice) {
  const keys = new Set(state.charges.map((c) => monthKey(c.year, c.month)));
  return [...keys].reduce((sum, key) => {
    const { year, month } = fromMonthKey(key);
    return sum + monthDebt(state, year, month);
  }, 0);
}

export function fundBalance(state: SeedSlice) {
  const income =
    state.payments
      .filter((payment) => !payment.pendingHandover)
      .reduce((sum, payment) => sum + payment.amount, 0) +
    state.handoverReceipts.reduce((sum, r) => sum + r.amount, 0);
  const spent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return income - spent - state.settings.managerDebtToFund;
}

export function fundBalanceThrough(state: SeedSlice, year: number, month: number) {
  const bound = monthKey(year, month);
  const income =
    state.payments
      .filter((p) => !p.pendingHandover && monthKey(p.year, p.month) <= bound)
      .reduce((sum, p) => sum + p.amount, 0) +
    state.handoverReceipts
      .filter((r) => monthKey(isoToJalali(r.date).year, isoToJalali(r.date).month) <= bound)
      .reduce((sum, r) => sum + r.amount, 0);
  const spent = state.expenses
    .filter((e) => {
      const j = expenseMonth(e);
      return monthKey(j.year, j.month) <= bound;
    })
    .reduce((sum, e) => sum + e.amount, 0);
  return income - spent;
}

/** Total still owed to the fund by a previous manager (or similar) — paid by
 * residents but not yet physically handed into this treasury. */
export function pendingHandoverTotal(state: SeedSlice) {
  return state.payments
    .filter((payment) => payment.pendingHandover)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

/** Total actually received back so far (see `HandoverReceipt`). */
export function handoverReceiptsTotal(state: SeedSlice) {
  return state.handoverReceipts.reduce((sum, r) => sum + r.amount, 0);
}

/** Total the current manager has repaid back into the fund so far (see
 * `ManagerRepayment`) — a display/audit total only; `fundBalance` reflects
 * repayments through `Settings.managerDebtToFund`, not this list directly. */
export function managerRepaymentsTotal(state: SeedSlice) {
  return state.managerRepayments.reduce((sum, r) => sum + r.amount, 0);
}

export function reminderText(state: SeedSlice, unit: Unit, year: number, month: number) {
  const remaining = getRemaining(state, unit.id, year, month);
  return `ساکن محترم واحد ${unit.number}، شارژ ${monthTitle(year, month)} هنوز تسویه نشده. مانده بدهی ${new Intl.NumberFormat("fa-IR").format(remaining)} تومان است. مهلت پرداخت از ۲۵ تا ۳۰ این ماه. واریز به کارت ${state.settings.cardNumber} نزد بانک ${state.settings.bank} به نام ${state.settings.manager}.`;
}
