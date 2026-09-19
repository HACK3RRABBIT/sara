import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { JalaliDateField } from "@/components/app/jalali-date-field";
import { UnitForm } from "@/components/app/unit-form";
import { changeAdminEmail, changeAdminPassword } from "@/lib/account-api";
import { signOut } from "@/lib/auth/client";
import { buildBackupPayload, downloadJson, parseBackupPayload, type BackupFile } from "@/lib/backup";
import {
  EXPENSE_LABELS,
  METHOD_LABELS,
  flushPendingSaves,
  freshBuilding,
  getCharge,
  getPaid,
  getRemaining,
  useBuildingStore,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/lib/store";
import {
  faNum,
  formatFaDate,
  jalaliToday,
  jalaliToIso,
  monthTitle,
  parseAmount,
  toman,
  chargeAmount,
} from "@/lib/format";

export function AppDialogs() {
  return (
    <>
      <PaymentDialog />
      <LedgerDialog />
      <ExpenseDialog />
      <UnitDialog />
      <SettingsDialog />
    </>
  );
}

function PaymentDialog() {
  const open = useBuildingStore((s) => s.paymentOpen);
  const unitId = useBuildingStore((s) => s.paymentUnitId);
  const year = useBuildingStore((s) => s.paymentYear);
  const month = useBuildingStore((s) => s.paymentMonth);
  const editId = useBuildingStore((s) => s.paymentEditId);
  const units = useBuildingStore((s) => s.units);
  const payments = useBuildingStore((s) => s.payments);
  const close = useBuildingStore((s) => s.closePayment);
  const recordPayment = useBuildingStore((s) => s.recordPayment);
  const updatePayment = useBuildingStore((s) => s.updatePayment);
  const removePayment = useBuildingStore((s) => s.removePayment);
  const store = useBuildingStore();
  const today = jalaliToday();
  const editing = editId ? payments.find((item) => item.id === editId) : undefined;
  const y = editing?.year ?? year ?? today.year;
  const m = editing?.month ?? month ?? today.month;
  const [selected, setSelected] = useState(editing?.unitId ?? unitId ?? units[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [date, setDate] = useState(jalaliToIso(today.year, today.month, today.day));
  const [note, setNote] = useState("");
  const [pendingHandover, setPendingHandover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remaining = useMemo(() => {
    if (!selected) return 0;
    const rest = getRemaining(store, selected, y, m);
    if (editing && editing.unitId === selected && editing.year === y && editing.month === m) {
      return rest + editing.amount;
    }
    return rest;
  }, [store, selected, y, m, editing]);

  useEffect(() => {
    if (!open) return;
    const current = editId
      ? useBuildingStore.getState().payments.find((item) => item.id === editId)
      : undefined;
    const nextUnit = current?.unitId ?? unitId ?? units[0]?.id ?? "";
    const yy = current?.year ?? year ?? today.year;
    const mm = current?.month ?? month ?? today.month;
    setSelected(nextUnit);
    if (current) {
      setAmount(String(current.amount));
      setMethod(current.method);
      setDate(current.date);
      setNote(current.note);
      setPendingHandover(Boolean(current.pendingHandover));
    } else {
      const rest = nextUnit ? getRemaining(useBuildingStore.getState(), nextUnit, yy, mm) : 0;
      setAmount(rest ? String(rest) : "");
      setMethod("card");
      setDate(jalaliToIso(today.year, today.month, today.day));
      setNote("");
      setPendingHandover(false);
    }
    setError(null);
    setConfirmDelete(false);
  }, [open, editId, unitId, units, year, month, today.year, today.month, today.day]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    if (!selected) {
      setError("واحد را انتخاب کنید.");
      return;
    }
    if (!editing && !getCharge(useBuildingStore.getState(), selected, y, m)) {
      setError("برای این ماه هنوز شارژ صادر نشده است.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("مبلغ معتبر وارد کنید.");
      return;
    }
    const payload = {
      unitId: selected,
      year: y,
      month: m,
      amount: value,
      method,
      date,
      note,
      pendingHandover,
    };
    if (editing) updatePayment(editing.id, payload);
    else recordPayment(payload);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={editing ? "ویرایش پرداخت" : "ثبت پرداخت شارژ"}
      description="مهلت پرداخت هر ماه از ۲۵ تا ۳۰ است. پرداخت زودتر هم ثبت می‌شود."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pay-unit">واحد</Label>
          <NativeSelect
            id="pay-unit"
            value={selected}
            onChange={(event) => {
              const id = event.target.value;
              setSelected(id);
              if (editing) return;
              const rest = getRemaining(useBuildingStore.getState(), id, y, m);
              setAmount(rest ? String(rest) : "");
            }}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                واحد {unit.number} — {unit.resident}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pay-amount">مبلغ (تومان)</Label>
          <Input
            id="pay-amount"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="مثلاً ۱۵۰۰۰۰۰"
          />
          {remaining > 0 ? (
            <p className="text-xs text-muted-foreground">مانده این ماه: {toman(remaining)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">برای این ماه مانده‌ای نیست.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pay-method">روش</Label>
          <NativeSelect
            id="pay-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            {Object.entries(METHOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <JalaliDateField id="pay-date" label="تاریخ واریز" value={date} onChange={setDate} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="pay-note">توضیح</Label>
          <Input id="pay-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <label className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={pendingHandover}
            onChange={(event) => setPendingHandover(event.target.checked)}
          />
          <span>
            ساکن پرداخت کرده، اما پول هنوز به صندوق نرسیده (مثلاً نزد مدیر قبلی مانده است). این واحد تسویه‌شده
            ثبت می‌شود ولی در موجودی صندوق حساب نمی‌شود تا وصول شود.
          </span>
        </label>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg">
          {editing ? "ذخیره تغییرات" : "ثبت پرداخت"}
        </Button>
        {editing ? (
          confirmDelete ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
                انصراف
              </Button>
              <Button type="button" className="flex-1" onClick={() => removePayment(editing.id)}>
                حذف شود
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
              حذف این پرداخت
            </Button>
          )
        ) : null}
      </form>
    </Dialog>
  );
}

function LedgerDialog() {
  const open = useBuildingStore((s) => s.ledgerOpen);
  const unitId = useBuildingStore((s) => s.ledgerUnitId);
  const year = useBuildingStore((s) => s.ledgerYear);
  const month = useBuildingStore((s) => s.ledgerMonth);
  const close = useBuildingStore((s) => s.closeLedger);
  const units = useBuildingStore((s) => s.units);
  const store = useBuildingStore();
  const unit = units.find((item) => item.id === unitId);
  const y = year ?? jalaliToday().year;
  const m = month ?? jalaliToday().month;
  const charge = unit ? getCharge(store, unit.id, y, m) : undefined;
  const payments = store.payments
    .filter((item) => item.unitId === unitId && item.year === y && item.month === m)
    .sort((a, b) => a.date.localeCompare(b.date));
  const paid = unit ? getPaid(store, unit.id, y, m) : 0;
  const remain = unit ? getRemaining(store, unit.id, y, m) : 0;
  const [chargeAmountValue, setChargeAmountValue] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [date, setDate] = useState(jalaliToIso(jalaliToday().year, jalaliToday().month, jalaliToday().day));
  const [note, setNote] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [chargeDeletePending, setChargeDeletePending] = useState(false);

  useEffect(() => {
    if (!open || !unitId) return;
    const state = useBuildingStore.getState();
    const current = getCharge(state, unitId, y, m);
    setChargeAmountValue(current ? String(current.amount) : "");
    setAmount("");
    setMethod("card");
    const today = jalaliToday();
    setDate(jalaliToIso(today.year, today.month, today.day));
    setNote("");
    setEditId(null);
    setError(null);
    setPending(null);
    setChargeDeletePending(false);
  }, [open, unitId, y, m]);

  if (!open || !unit) return null;
  const current = unit;

  function saveCharge() {
    const value = parseAmount(chargeAmountValue);
    if (!Number.isFinite(value) || value < 0) {
      setError("مبلغ شارژ معتبر نیست.");
      return;
    }
    const state = useBuildingStore.getState();
    state.ensureCharge(current.id, y, m);
    const next = getCharge(useBuildingStore.getState(), current.id, y, m);
    if (next) state.updateCharge(next.id, { amount: value });
    setError(null);
  }

  function startEdit(id: string) {
    const payment = payments.find((item) => item.id === id);
    if (!payment) return;
    setEditId(payment.id);
    setAmount(String(payment.amount));
    setMethod(payment.method);
    setDate(payment.date);
    setNote(payment.note);
    setError(null);
  }

  function onSubmitPayment(event: FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("مبلغ پرداخت معتبر نیست.");
      return;
    }
    const state = useBuildingStore.getState();
    state.ensureCharge(current.id, y, m);
    if (editId) {
      state.updatePayment(editId, {
        unitId: current.id,
        year: y,
        month: m,
        amount: value,
        method,
        date,
        note,
      });
    } else {
      state.recordPayment({
        unitId: current.id,
        year: y,
        month: m,
        amount: value,
        method,
        date,
        note,
      });
      useBuildingStore.setState({ ledgerOpen: true, ledgerUnitId: current.id, ledgerYear: y, ledgerMonth: m });
    }
    setEditId(null);
    setAmount("");
    setNote("");
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={`واحد ${unit.number} · ${monthTitle(y, m)}`}
      description={`${unit.resident || "بدون ساکن"} — پرداخت ${toman(paid)} از ${charge ? toman(charge.amount) : "—"} · مانده ${toman(remain)}`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ledger-charge">مبلغ شارژ این ماه (تومان)</Label>
          <div className="flex gap-2">
            <Input
              id="ledger-charge"
              inputMode="numeric"
              value={chargeAmountValue}
              onChange={(event) => setChargeAmountValue(event.target.value)}
            />
            <Button type="button" variant="outline" onClick={saveCharge}>
              ذخیره شارژ
            </Button>
          </div>
          {charge ? (
            chargeDeletePending ? (
              <div className="flex gap-2">
                <p className="flex-1 self-center text-xs text-muted-foreground">
                  شارژ این ماه برای این واحد کاملاً حذف می‌شود (نه صفر) — یعنی «صادر نشده».
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => setChargeDeletePending(false)}>
                  انصراف
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    store.removeCharge(charge.id);
                    setChargeAmountValue("");
                    setChargeDeletePending(false);
                  }}
                >
                  حذف شارژ شود
                </Button>
              </div>
            ) : (
              <Button type="button" size="sm" variant="ghost" onClick={() => setChargeDeletePending(true)}>
                حذف کامل شارژ این ماه
              </Button>
            )
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">پرداختی‌های این ماه</p>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز پرداختی ثبت نشده.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-col gap-2 rounded-xl bg-muted/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium tabular-nums">{toman(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFaDate(payment.date)} · {METHOD_LABELS[payment.method]}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(payment.id)}>
                      ویرایش
                    </Button>
                    {pending === payment.id ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          store.removePayment(payment.id);
                          setPending(null);
                          if (editId === payment.id) setEditId(null);
                        }}
                      >
                        حذف شود
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPending(payment.id)}>
                        حذف
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={onSubmitPayment} className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-medium">{editId ? "ویرایش پرداخت" : "پرداخت جدید"}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ledger-amount">مبلغ (تومان)</Label>
            <Input
              id="ledger-amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ledger-method">روش</Label>
            <NativeSelect
              id="ledger-method"
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            >
              {Object.entries(METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <JalaliDateField id="ledger-date" label="تاریخ واریز" value={date} onChange={setDate} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="ledger-note">توضیح</Label>
            <Input id="ledger-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg">
            {editId ? "ذخیره پرداخت" : "ثبت پرداخت"}
          </Button>
          {editId ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditId(null);
                setAmount("");
                setNote("");
              }}
            >
              انصراف از ویرایش
            </Button>
          ) : null}
        </form>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => store.settleUnitMonth(unit.id, y, m)}
            disabled={remain <= 0}
          >
            تسویه کامل مانده
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => store.clearMonthPayments(unit.id, y, m)}
            disabled={payments.length === 0}
          >
            پاک کردن پرداخت‌ها
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ExpenseDialog() {
  const open = useBuildingStore((s) => s.expenseOpen);
  const close = useBuildingStore((s) => s.closeExpense);
  const addExpense = useBuildingStore((s) => s.addExpense);
  const today = jalaliToday();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("repair");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(jalaliToIso(today.year, today.month, today.day));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setCategory("repair");
    setAmount("");
    setVendor("");
    setDate(jalaliToIso(today.year, today.month, today.day));
    setNote("");
    setError(null);
  }, [open, today.year, today.month, today.day]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    if (!title.trim()) {
      setError("عنوان هزینه را بنویسید.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("مبلغ معتبر وارد کنید.");
      return;
    }
    addExpense({
      title: title.trim(),
      category,
      amount: value,
      vendor: vendor.trim(),
      date,
      note,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()} title="ثبت هزینه ساختمان">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-title">عنوان</Label>
          <Input
            id="ex-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="مثلاً تعمیر در پارکینگ"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-cat">دسته‌بندی</Label>
          <NativeSelect
            id="ex-cat"
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
          >
            {Object.entries(EXPENSE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-amount">مبلغ (تومان)</Label>
          <Input
            id="ex-amount"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-vendor">طرف حساب</Label>
          <Input id="ex-vendor" value={vendor} onChange={(event) => setVendor(event.target.value)} />
        </div>
        <JalaliDateField id="ex-date" label="تاریخ" value={date} onChange={setDate} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="ex-note">توضیح</Label>
          <Input id="ex-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg">
          ثبت هزینه
        </Button>
      </form>
    </Dialog>
  );
}

function UnitDialog() {
  const id = useBuildingStore((s) => s.unitEditId);
  const unit = useBuildingStore((s) => s.units.find((item) => item.id === id));
  const close = useBuildingStore((s) => s.closeUnitEdit);
  const updateUnit = useBuildingStore((s) => s.updateUnit);
  const removeUnit = useBuildingStore((s) => s.removeUnit);
  const settings = useBuildingStore((s) => s.settings);

  if (!id || !unit) return null;

  const current = unit;
  const isDraft = !current.number.trim() && !current.resident.trim();

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && close()}
      title={isDraft ? "واحد جدید" : `ویرایش واحد ${current.number}`}
      description="شماره، نام ساکن، طبقه و تعداد نفرات را عوض کنید. ذخیره در پایگاه داده می‌ماند."
    >
      <UnitForm
        unit={current}
        settings={settings}
        submitLabel="ذخیره مشخصات"
        onSave={(patch) => {
          updateUnit(current.id, patch);
          useBuildingStore.setState({ unitEditId: undefined });
        }}
        onDelete={
          isDraft
            ? undefined
            : () => {
                removeUnit(current.id);
              }
        }
      />
    </Dialog>
  );
}

function SettingsDialog() {
  const open = useBuildingStore((s) => s.settingsOpen);
  const close = useBuildingStore((s) => s.closeSettings);
  const settings = useBuildingStore((s) => s.settings);
  const updateSettings = useBuildingStore((s) => s.updateSettings);
  const [form, setForm] = useState(settings);

  useEffect(() => {
    if (open) setForm(settings);
  }, [open, settings]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    // 0 is a legitimate value (e.g. turning the per-person share off), so only
    // unparsable input falls back — no `|| old` that would block saving zero.
    const base = parseAmount(String(form.baseCharge));
    const per = parseAmount(String(form.perPerson));
    const receivable = parseAmount(String(form.previousManagerReceivable));
    updateSettings({
      ...form,
      baseCharge: Number.isNaN(base) || base < 0 ? settings.baseCharge : base,
      perPerson: Number.isNaN(per) || per < 0 ? settings.perPerson : per,
      previousManagerReceivable:
        Number.isNaN(receivable) || receivable < 0 ? settings.previousManagerReceivable : receivable,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title="تنظیمات ساختمان"
      description="نام ساختمان، کارت و مبلغ شارژ را اینجا عوض کنید. واحدها را از صفحهٔ واحدها ویرایش کنید. همه چیز در پایگاه داده ذخیره می‌شود."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-name">نام ساختمان</Label>
          <Input
            id="s-name"
            value={form.buildingName}
            onChange={(event) => setForm({ ...form, buildingName: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-addr">آدرس</Label>
          <Input
            id="s-addr"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-mgr">مدیر / خزانه‌دار</Label>
          <Input
            id="s-mgr"
            value={form.manager}
            onChange={(event) => setForm({ ...form, manager: event.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-card">شماره کارت</Label>
            <Input
              id="s-card"
              dir="ltr"
              value={form.cardNumber}
              onChange={(event) => setForm({ ...form, cardNumber: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-bank">بانک</Label>
            <Input
              id="s-bank"
              value={form.bank}
              onChange={(event) => setForm({ ...form, bank: event.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-base">شارژ پایه (تومان)</Label>
            <Input
              id="s-base"
              dir="ltr"
              inputMode="numeric"
              value={form.baseCharge === 0 ? "" : String(form.baseCharge)}
              onChange={(event) =>
                setForm({ ...form, baseCharge: parseAmount(event.target.value) || 0 })
              }
              placeholder={String(settings.baseCharge)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-pp">سهم هر نفر (تومان)</Label>
            <Input
              id="s-pp"
              dir="ltr"
              inputMode="numeric"
              value={form.perPerson === 0 ? "" : String(form.perPerson)}
              onChange={(event) =>
                setForm({ ...form, perPerson: parseAmount(event.target.value) || 0 })
              }
              placeholder={String(settings.perPerson)}
            />
          </div>
        </div>
        {form.baseCharge > 0 ? (
          <p className="text-xs text-muted-foreground">
            مثال: واحد سه‌نفره {toman(chargeAmount(form.baseCharge, form.perPerson, 3))} می‌شود.
          </p>
        ) : (
          <p className="text-xs text-destructive">شارژ پایه باید بیشتر از صفر باشد.</p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-receivable">مطالبات از مدیر قبلی (تومان)</Label>
          <Input
            id="s-receivable"
            dir="ltr"
            inputMode="numeric"
            value={form.previousManagerReceivable === 0 ? "" : String(form.previousManagerReceivable)}
            onChange={(event) =>
              setForm({ ...form, previousManagerReceivable: parseAmount(event.target.value) || 0 })
            }
            placeholder="۰"
          />
          <p className="text-xs text-muted-foreground">
            پولی که ساکنان پرداخت کرده‌اند ولی هنوز از مدیر قبلی تحویل نگرفته‌اید — تخمین شما. در داشبورد جدا
            از موجودی صندوق نشان داده می‌شود. وقتی واقعاً بخشی می‌رسد، آن را دستی کم نکنید — پایین همین صفحه
            «دریافت از مدیر قبلی» را ثبت کنید تا هم از این عدد کم شود، هم به موجودی واقعی صندوق اضافه شود.
          </p>
        </div>
        <Button type="submit" size="lg">
          ذخیره تنظیمات
        </Button>
      </form>
      {/* Outside the settings <form>: nested forms are invalid HTML and the
          browser would strip the inner ones, breaking both buttons. */}
      <HandoverReceiptsSection />
      <AdminAccountSection />
      <BackupSection buildingName={settings.buildingName} onCleared={close} />
    </Dialog>
  );
}

function HandoverReceiptsSection() {
  const receipts = useBuildingStore((s) => s.handoverReceipts);
  const recordHandoverReceipt = useBuildingStore((s) => s.recordHandoverReceipt);
  const removeHandoverReceipt = useBuildingStore((s) => s.removeHandoverReceipt);
  const today = jalaliToday();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(jalaliToIso(today.year, today.month, today.day));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  function submit() {
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("مبلغ معتبر وارد کنید.");
      return;
    }
    recordHandoverReceipt({ amount: value, date, note: note.trim() });
    setAmount("");
    setNote("");
    setDate(jalaliToIso(today.year, today.month, today.day));
    setError(null);
  }

  const sorted = [...receipts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
      <div>
        <h3 className="font-display text-heading font-medium">دریافت از مدیر قبلی</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          هر بار بخشی از مطالباتی که بالا نوشتید واقعاً به شما برسد، همین‌جا ثبت کنید — هم از آن مطالبات کم
          می‌شود، هم به موجودی واقعی صندوق اضافه می‌شود.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="hr-amount">مبلغ (تومان)</Label>
          <Input
            id="hr-amount"
            dir="ltr"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="مثلاً ۲۰۰۰۰۰۰"
          />
        </div>
        <JalaliDateField id="hr-date" label="تاریخ دریافت" value={date} onChange={setDate} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="hr-note">توضیح (اختیاری)</Label>
        <Input id="hr-note" value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="button" variant="outline" onClick={submit}>
        ثبت دریافت
      </Button>

      {sorted.length ? (
        <ul className="flex flex-col gap-2">
          {sorted.map((receipt) => (
            <li
              key={receipt.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium tabular-nums">{toman(receipt.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFaDate(receipt.date)}
                  {receipt.note ? ` · ${receipt.note}` : ""}
                </p>
              </div>
              {pending === receipt.id ? (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>
                    لغو
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      removeHandoverReceipt(receipt.id);
                      setPending(null);
                    }}
                  >
                    حذف شود
                  </Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="ghost" onClick={() => setPending(receipt.id)}>
                  حذف
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AdminAccountSection() {
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function onChangeEmail(event: FormEvent) {
    event.preventDefault();
    setEmailOk(false);
    if (!email.includes("@")) {
      setEmailError("ایمیل معتبر وارد کنید.");
      return;
    }
    if (!emailPassword) {
      setEmailError("رمز فعلی را وارد کنید.");
      return;
    }
    setEmailBusy(true);
    setEmailError(null);
    const result = await changeAdminEmail({ data: { newEmail: email, currentPassword: emailPassword } });
    setEmailBusy(false);
    if (result.ok) {
      setEmailOk(true);
      setEmail("");
      setEmailPassword("");
    } else {
      setEmailError(result.message ?? "ایمیل تغییر نکرد.");
    }
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("رمز تازه دست‌کم ۸ نویسه است.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("تکرار رمز با رمز تازه یکسان نیست.");
      return;
    }
    setPasswordBusy(true);
    setPasswordError(null);
    const result = await changeAdminPassword({
      data: { currentPassword, newPassword },
    });
    setPasswordBusy(false);
    if (result.ok) {
      // Every session was revoked — sign in again with the new password.
      await signOut("/login");
      return;
    }
    setPasswordError(result.message ?? "رمز تغییر نکرد.");
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">حساب مدیر</p>
      <form onSubmit={onChangeEmail} className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-ac-email">ایمیل تازه</Label>
            <Input
              id="s-ac-email"
              dir="ltr"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-ac-email-pass">رمز فعلی</Label>
            <Input
              id="s-ac-email-pass"
              dir="ltr"
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
            />
          </div>
        </div>
        <Button type="submit" variant="outline" disabled={emailBusy}>
          {emailBusy ? "…" : "تغییر ایمیل"}
        </Button>
        {emailOk ? (
          <p className="text-xs text-muted-foreground">
            ایمیل عوض شد. دفعهٔ بعد با ایمیل تازه وارد شوید.
          </p>
        ) : null}
        {emailError ? (
          <p className="text-xs text-destructive" role="alert">
            {emailError}
          </p>
        ) : null}
      </form>
      <form onSubmit={onChangePassword} className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-ac-pass-current">رمز فعلی</Label>
            <Input
              id="s-ac-pass-current"
              dir="ltr"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-ac-pass-new">رمز تازه</Label>
            <Input
              id="s-ac-pass-new"
              dir="ltr"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-ac-pass-confirm">تکرار رمز تازه</Label>
            <Input
              id="s-ac-pass-confirm"
              dir="ltr"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>
        <Button type="submit" variant="outline" disabled={passwordBusy}>
          {passwordBusy ? "…" : "تغییر رمز"}
        </Button>
        {passwordError ? (
          <p className="text-xs text-destructive" role="alert">
            {passwordError}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function BackupSection({
  buildingName,
  onCleared,
}: {
  buildingName: string;
  onCleared: () => void;
}) {
  const hydrateFrom = useBuildingStore((s) => s.hydrateFrom);
  const resetDemo = useBuildingStore((s) => s.resetDemo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const [restorePending, setRestorePending] = useState<BackupFile | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);

  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);

  async function downloadBackup() {
    setBackupBusy(true);
    setBackupError(null);
    try {
      // Same "don't export a stale cache" pattern the Excel export uses:
      // wait for queued autosaves, then read the DB fresh.
      await flushPendingSaves();
      const { revision: _revision, ...snapshot } = await freshBuilding();
      const { fileName, json } = buildBackupPayload(snapshot, buildingName);
      downloadJson(fileName, json);
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "خطا در تهیهٔ نسخهٔ پشتیبان");
    } finally {
      setBackupBusy(false);
    }
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again later
    if (!file) return;
    setRestoreError(null);
    setRestoreDone(false);
    try {
      const text = await file.text();
      setRestorePending(parseBackupPayload(text));
    } catch (error) {
      setRestorePending(null);
      setRestoreError(error instanceof Error ? error.message : "این فایل خوانده نشد.");
    }
  }

  async function confirmRestore() {
    if (!restorePending) return;
    setRestoreBusy(true);
    setRestoreError(null);
    try {
      hydrateFrom(restorePending.data);
      await flushPendingSaves();
      setRestorePending(null);
      setRestoreDone(true);
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "بازیابی ذخیره نشد — دوباره تلاش کنید.");
    } finally {
      setRestoreBusy(false);
    }
  }

  async function confirmClear() {
    setClearBusy(true);
    try {
      // Always taken, never skippable by clicking fast — this is the safety
      // net for exactly the mistake that prompted this feature.
      await flushPendingSaves();
      const { revision: _revision, ...snapshot } = await freshBuilding();
      const { fileName, json } = buildBackupPayload(snapshot, buildingName);
      downloadJson(fileName, json);
    } catch {
      // A failed safety backup must not block the clear the person just
      // confirmed twice — fall through using whatever's in local state.
    }
    resetDemo();
    setClearBusy(false);
    setClearConfirm(false);
    onCleared();
  }

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
      <div>
        <h3 className="font-display text-heading font-medium">پشتیبان‌گیری</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          یک فایل کامل از همهٔ واحدها، شارژها، پرداخت‌ها و هزینه‌ها دانلود کنید — بعداً از همین فایل می‌توانید
          دقیقاً همین وضعیت را برگردانید.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={backupBusy} onClick={() => void downloadBackup()}>
          {backupBusy ? "در حال آماده‌سازی…" : "دانلود نسخهٔ پشتیبان"}
        </Button>
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          بازیابی از فایل پشتیبان
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => void onFileSelected(event)}
        />
      </div>
      {backupError ? (
        <p className="text-sm text-destructive" role="alert">
          {backupError}
        </p>
      ) : null}

      {restoreError ? (
        <p className="text-sm text-destructive" role="alert">
          {restoreError}
        </p>
      ) : null}
      {restoreDone ? <p className="text-sm text-muted-foreground">بازیابی انجام شد.</p> : null}

      {restorePending ? (
        <div className="flex flex-col gap-3 rounded-xl bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            این کار داده‌های فعلی را با نسخهٔ پشتیبان مربوط به {formatFaDate(restorePending.exportedAt)} جایگزین
            می‌کند: {faNum(restorePending.data.units.length)} واحد، {faNum(restorePending.data.charges.length)}{" "}
            شارژ، {faNum(restorePending.data.payments.length)} پرداخت و {faNum(restorePending.data.expenses.length)}{" "}
            هزینه. این کار قابل بازگشت نیست مگر با یک پشتیبان دیگر.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={restoreBusy}
              onClick={() => setRestorePending(null)}
            >
              لغو
            </Button>
            <Button type="button" className="flex-1" disabled={restoreBusy} onClick={() => void confirmRestore()}>
              {restoreBusy ? "در حال بازیابی…" : "بازیابی شود"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-border pt-4">
        {clearConfirm ? (
          <div className="flex flex-col gap-3 rounded-xl bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              همهٔ واحدها، شارژها، پرداخت‌ها و هزینه‌ها پاک می‌شود. قبل از پاک شدن، یک نسخهٔ پشتیبان از وضعیت فعلی
              خودکار دانلود می‌شود.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={clearBusy}
                onClick={() => setClearConfirm(false)}
              >
                لغو
              </Button>
              <Button type="button" className="flex-1" disabled={clearBusy} onClick={() => void confirmClear()}>
                {clearBusy ? "در حال پاک کردن…" : "پاک کردن شود"}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setClearConfirm(true)}>
            پاک کردن همه داده‌ها
          </Button>
        )}
      </div>
    </div>
  );
}
