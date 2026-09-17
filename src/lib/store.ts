import { create } from "zustand";
import { chargeAmount, faNum, jalaliToIso, jalaliToday, monthTitle, parseAmount } from "@/lib/format";
import {
  EXPENSE_LABELS,
  METHOD_LABELS,
  STATUS_LABELS,
  type BuildingSnapshot,
  type Charge,
  type Expense,
  type Payment,
  type PayStatus,
  type PaymentMethod,
  type ExpenseCategory,
  type SeedSlice,
  type Settings,
  type Unit,
  expenseMonth,
  fundBalance,
  fundBalanceThrough,
  getCharge,
  getPaid,
  getRemaining,
  getStatus,
  monthDebt,
  monthKey,
  fromMonthKey,
  monthTotals,
  reminderText,
  totalDebt,
} from "@/lib/building-core";

// Re-export the pure model so existing routes keep importing from "@/lib/store".
export {
  EXPENSE_LABELS,
  METHOD_LABELS,
  STATUS_LABELS,
  expenseMonth,
  fundBalance,
  fundBalanceThrough,
  getCharge,
  getPaid,
  getRemaining,
  getStatus,
  monthDebt,
  monthKey,
  fromMonthKey,
  monthTotals,
  reminderText,
  totalDebt,
};
export type {
  BuildingSnapshot,
  Charge,
  Expense,
  Payment,
  PayStatus,
  PaymentMethod,
  ExpenseCategory,
  SeedSlice,
  Settings,
  Unit,
};

export const MAX_UNITS = 10;

const LEGACY_UNIT_NUMBERS = ["۱۰۱", "۱۰۲", "۲۰۱", "۲۰۲", "۳۰۱", "۳۰۲", "۴۰۱", "۴۰۲", "۵۰۱", "۵۰۲"];

const uid = () => crypto.randomUUID();

export const DEFAULT_SETTINGS: Settings = {
  buildingName: "سرا",
  address: "",
  manager: "",
  cardNumber: "",
  bank: "",
  baseCharge: 1_500_000,
  perPerson: 100_000,
};

function unitAmount(settings: Settings, unit: Unit) {
  return chargeAmount(settings.baseCharge, settings.perPerson, unit.occupants);
}

function clampUnits(units: Unit[]) {
  return units.slice(0, MAX_UNITS).map((unit, index) => {
    const n = index + 1;
    const legacy = LEGACY_UNIT_NUMBERS.includes(unit.number);
    return {
      ...unit,
      note: unit.note ?? "",
      number: legacy || !unit.number.trim() ? faNum(n) : unit.number,
      floor: legacy ? Math.ceil(n / 2) : unit.floor,
    };
  });
}

export function sortUnits(units: Unit[]) {
  return [...units].sort((a, b) => {
    const na = parseAmount(a.number);
    const nb = parseAmount(b.number);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.floor - b.floor || a.number.localeCompare(b.number, "fa");
  });
}

function createEmpty(): SeedSlice {
  return {
    units: [],
    charges: [],
    payments: [],
    expenses: [],
    settings: DEFAULT_SETTINGS,
  };
}

type DialogState = {
  paymentOpen: boolean;
  paymentUnitId?: string;
  paymentYear?: number;
  paymentMonth?: number;
  paymentEditId?: string;
  ledgerOpen: boolean;
  ledgerUnitId?: string;
  ledgerYear?: number;
  ledgerMonth?: number;
  expenseOpen: boolean;
  unitEditId?: string;
  settingsOpen: boolean;
};

type BuildingState = DialogState &
  SeedSlice & {
    hydrated: boolean;
    hydrateFrom: (snapshot: SeedSlice) => void;
    recordPayment: (input: Omit<Payment, "id">) => void;
    updatePayment: (id: string, patch: Partial<Omit<Payment, "id">>) => void;
    removePayment: (id: string) => void;
    addExpense: (input: Omit<Expense, "id">) => void;
    removeExpense: (id: string) => void;
    updateUnit: (id: string, patch: Partial<Omit<Unit, "id">>) => void;
    addUnit: () => string;
    removeUnit: (id: string) => void;
    updateSettings: (patch: Partial<Settings>) => void;
    updateCharge: (id: string, patch: Partial<Omit<Charge, "id" | "unitId" | "year" | "month">>) => void;
    ensureCharge: (unitId: string, year: number, month: number) => void;
    clearMonthPayments: (unitId: string, year: number, month: number) => void;
    settleUnitMonth: (unitId: string, year: number, month: number) => void;
    issueCharges: (year: number, month: number) => { ok: boolean; reason?: string };
    openLedger: (opts: { unitId: string; year: number; month: number }) => void;
    closeLedger: () => void;
    openPayment: (opts?: { unitId?: string; year?: number; month?: number; paymentId?: string }) => void;
    closePayment: () => void;
    openExpense: () => void;
    closeExpense: () => void;
    openUnitEdit: (id: string) => void;
    closeUnitEdit: () => void;
    openSettings: () => void;
    closeSettings: () => void;
    resetDemo: () => void;
  };

const emptyDialogs: DialogState = {
  paymentOpen: false,
  paymentUnitId: undefined,
  paymentYear: undefined,
  paymentMonth: undefined,
  paymentEditId: undefined,
  ledgerOpen: false,
  ledgerUnitId: undefined,
  ledgerYear: undefined,
  ledgerMonth: undefined,
  expenseOpen: false,
  unitEditId: undefined,
  settingsOpen: false,
};

export const useBuildingStore = create<BuildingState>()((set, get) => ({
  ...createEmpty(),
  ...emptyDialogs,
  hydrated: false,
  hydrateFrom: (snapshot) =>
    set({
      units: clampUnits(snapshot.units ?? []),
      charges: snapshot.charges ?? [],
      payments: snapshot.payments ?? [],
      expenses: snapshot.expenses ?? [],
      settings: { ...DEFAULT_SETTINGS, ...snapshot.settings },
      hydrated: true,
    }),
  recordPayment: (input) =>
    set({
      payments: [...get().payments, { ...input, id: uid() }],
      paymentOpen: false,
      paymentEditId: undefined,
    }),
  updatePayment: (id, patch) =>
    set({
      payments: get().payments.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      paymentOpen: false,
      paymentEditId: undefined,
    }),
  removePayment: (id) =>
    set({
      payments: get().payments.filter((item) => item.id !== id),
      paymentOpen: get().paymentEditId === id ? false : get().paymentOpen,
      paymentEditId: get().paymentEditId === id ? undefined : get().paymentEditId,
    }),
  addExpense: (input) =>
    set({
      expenses: [...get().expenses, { ...input, id: uid() }],
      expenseOpen: false,
    }),
  removeExpense: (id) => set({ expenses: get().expenses.filter((item) => item.id !== id) }),
  updateUnit: (id, patch) =>
    set({
      units: get().units.map((unit) => (unit.id === id ? { ...unit, note: unit.note ?? "", ...patch } : unit)),
    }),
  addUnit: () => {
    if (get().units.length >= MAX_UNITS) return "";
    const used = new Set(
      get().units.map((unit) => parseAmount(unit.number)).filter((n) => n >= 1 && n <= MAX_UNITS),
    );
    let n = 1;
    while (used.has(n) && n <= MAX_UNITS) n += 1;
    const id = uid();
    const unit: Unit = {
      id,
      number: faNum(n),
      floor: Math.ceil(n / 2),
      occupants: 1,
      resident: "",
      phone: "",
      occupied: true,
      note: "",
    };
    set({ units: [...get().units, unit], unitEditId: id });
    return id;
  },
  removeUnit: (id) =>
    set({
      units: get().units.filter((unit) => unit.id !== id),
      charges: get().charges.filter((charge) => charge.unitId !== id),
      payments: get().payments.filter((payment) => payment.unitId !== id),
      unitEditId: get().unitEditId === id ? undefined : get().unitEditId,
    }),
  updateSettings: (patch) => set({ settings: { ...get().settings, ...patch }, settingsOpen: false }),
  updateCharge: (id, patch) =>
    set({
      charges: get().charges.map((charge) => (charge.id === id ? { ...charge, ...patch } : charge)),
    }),
  ensureCharge: (unitId, year, month) => {
    const state = get();
    if (getCharge(state, unitId, year, month)) return;
    const unit = state.units.find((item) => item.id === unitId);
    if (!unit) return;
    set({
      charges: [
        ...state.charges,
        {
          id: uid(),
          unitId,
          year,
          month,
          amount: unitAmount(state.settings, unit),
          note: `شارژ ${monthTitle(year, month)}`,
          issuedAt: new Date().toISOString(),
        },
      ],
    });
  },
  clearMonthPayments: (unitId, year, month) =>
    set({
      payments: get().payments.filter(
        (payment) => !(payment.unitId === unitId && payment.year === year && payment.month === month),
      ),
    }),
  settleUnitMonth: (unitId, year, month) => {
    get().ensureCharge(unitId, year, month);
    const remain = getRemaining(get(), unitId, year, month);
    if (remain <= 0) return;
    const today = jalaliToday(new Date());
    set({
      payments: [
        ...get().payments,
        {
          id: uid(),
          unitId,
          year,
          month,
          amount: remain,
          method: "card",
          date: jalaliToIso(today.year, today.month, today.day),
          note: "تسویه کامل",
        },
      ],
    });
  },
  issueCharges: (year, month) => {
    const state = get();
    if (state.charges.some((charge) => charge.year === year && charge.month === month)) {
      return { ok: false, reason: "شارژ این ماه قبلاً صادر شده است." };
    }
    const issuedAt = new Date().toISOString();
    const next = state.units.map((unit) => ({
      id: uid(),
      unitId: unit.id,
      year,
      month,
      amount: unitAmount(state.settings, unit),
      note: `شارژ ${monthTitle(year, month)}`,
      issuedAt,
    }));
    set({ charges: [...state.charges, ...next] });
    return { ok: true };
  },
  openPayment: (opts) =>
    set({
      paymentOpen: true,
      paymentUnitId: opts?.unitId,
      paymentYear: opts?.year,
      paymentMonth: opts?.month,
      paymentEditId: opts?.paymentId,
    }),
  closePayment: () => set({ paymentOpen: false, paymentEditId: undefined }),
  openLedger: (opts) =>
    set({
      ledgerOpen: true,
      ledgerUnitId: opts.unitId,
      ledgerYear: opts.year,
      ledgerMonth: opts.month,
    }),
  closeLedger: () =>
    set({
      ledgerOpen: false,
      ledgerUnitId: undefined,
      ledgerYear: undefined,
      ledgerMonth: undefined,
    }),
  openExpense: () => set({ expenseOpen: true }),
  closeExpense: () => set({ expenseOpen: false }),
  openUnitEdit: (id) => set({ unitEditId: id }),
  closeUnitEdit: () => {
    const id = get().unitEditId;
    const unit = get().units.find((item) => item.id === id);
    if (unit && !unit.number.trim() && !unit.resident.trim()) {
      get().removeUnit(unit.id);
      return;
    }
    set({ unitEditId: undefined });
  },
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  resetDemo: () => set({ ...createEmpty(), ...emptyDialogs, hydrated: true }),
}));

function takeSnapshot(state: SeedSlice): BuildingSnapshot {
  return {
    units: state.units,
    charges: state.charges,
    payments: state.payments,
    expenses: state.expenses,
    settings: state.settings,
  };
}

export type SaveState = {
  queued: boolean;
  inFlight: boolean;
  lastError: string | null;
  retryCount: number;
};

// ---- Serialized, acknowledged save queue -------------------------------
//
// The previous autosave marked a snapshot "saved" BEFORE the request resolved
// and could interleave two POSTs, so a slow earlier save could clobber a later
// one; a network failure silently dropped the change too. Now: one debounced
// save at a time, marked saved only on `ok: true`, with error state + retry
// exposed for the export button (which must not read disk while a change is
// still pending).

let lastSaved = "";
let knownRevision = 0;
let debouncerTimer: ReturnType<typeof setTimeout> | undefined;
let chain: Promise<void> = Promise.resolve();
const saveState: SaveState = {
  queued: false,
  inFlight: false,
  lastError: null,
  retryCount: 0,
};

function encode(state: SeedSlice) {
  return JSON.stringify(takeSnapshot(state));
}

/** Reveal the save queue's status for UI (export progress, dirty badge). */
export function getSaveState(): SaveState {
  return { ...saveState };
}

/** Wait until every acknowledged change is on disk; throws on retries-exhausted failure. */
export async function flushPendingSaves(): Promise<void> {
  if (debouncerTimer) {
    clearTimeout(debouncerTimer);
    debouncerTimer = undefined;
    saveState.queued = false;
    // The debounce target may never have been attempted — schedule once now.
    if (useBuildingStore.getState().hydrated && encode(useBuildingStore.getState()) !== lastSaved) {
      startSave();
    }
  }
  await chain;
  if (encode(useBuildingStore.getState()) !== lastSaved) {
    startSave();
    await chain;
  }
}

async function performSave(): Promise<void> {
  const { saveBuilding } = await import("@/lib/building-api");
  saveState.inFlight = true;
  try {
    const state = useBuildingStore.getState();
    const data = takeSnapshot(state);
    const result = await saveBuilding({ data, revision: knownRevision } as Parameters<
      typeof saveBuilding
    >[0]);
    if (!result?.ok) {
      // CAS refused a stale write — someone else saved first. One rehydration
      // attempt to converge; we never silently overwrite a newer snapshot.
      saveState.lastError = "ناسازگاری نسخه — بارگذاری مجدد";
      saveState.retryCount += 1;
      return;
    }
    knownRevision = result.revision;
    lastSaved = encode(state);
    saveState.lastError = null;
    saveState.retryCount = 0;
  } catch (error) {
    saveState.lastError = error instanceof Error ? error.message : "خطا در ذخیره‌سازی";
    saveState.retryCount += 1;
  } finally {
    saveState.inFlight = false;
  }
}

function startSave() {
  const run = chain.then(() => performSave());
  chain = run.catch(() => undefined); // failures surface via saveState, never wedge the queue
  return run;
}

if (typeof window !== "undefined") {
  useBuildingStore.subscribe((state) => {
    if (!state.hydrated) return;
    const encoded = encode(state);
    if (encoded === lastSaved) return;
    if (debouncerTimer) clearTimeout(debouncerTimer);
    saveState.queued = true;
    debouncerTimer = setTimeout(() => {
      debouncerTimer = undefined;
      saveState.queued = false;
      lastSaved = encoded; // only this exact change becomes "in progress"
      startSave();
    }, 400);
  });
}

export async function hydrateBuilding() {
  const { loadBuilding } = await import("@/lib/building-api");
  const data = await loadBuilding();
  // A refresh while a save was pending must NOT replace the fresh read with
  // the (stale or half-saved) snapshot the server still holds, and hydration
  // itself must never enqueue a save of an empty pre-hydrated state.
  const { revision, ...snapshot } = data;
  knownRevision = typeof revision === "number" ? revision : 0;
  lastSaved = encode({
    units: snapshot.units ?? [],
    charges: snapshot.charges ?? [],
    payments: snapshot.payments ?? [],
    expenses: snapshot.expenses ?? [],
    settings: snapshot.settings,
  });
  useBuildingStore.getState().hydrateFrom(snapshot);
}

/** Read the building straight from the database (server fn) — bypasses the store cache. */
export async function freshBuilding() {
  const { loadBuilding } = await import("@/lib/building-api");
  return loadBuilding();
}

/** Reset local cache + save queue (logout / auth handoff). Safe to call always. */
export function resetBuilding() {
  if (debouncerTimer) {
    clearTimeout(debouncerTimer);
    debouncerTimer = undefined;
  }
  saveState.queued = false;
  saveState.inFlight = false;
  saveState.lastError = null;
  saveState.retryCount = 0;
  chain = Promise.resolve();
  lastSaved = "";
  knownRevision = 0;
  useBuildingStore.getState().hydrateFrom({
    units: [],
    charges: [],
    payments: [],
    expenses: [],
    settings: DEFAULT_SETTINGS,
  });
}
