import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { JalaliDateField } from "@/components/app/jalali-date-field";
import { UnitForm } from "@/components/app/unit-form";
import { changeAdminEmail, changeAdminPassword } from "@/lib/account-api";
import { signOut } from "@/lib/auth/client";
import {
  EXPENSE_LABELS,
  METHOD_LABELS,
  getCharge,
  getPaid,
  getRemaining,
  useBuildingStore,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/lib/store";
import { formatFaDate, jalaliToday, jalaliToIso, monthTitle, parseAmount, toman, chargeAmount } from "@/lib/format";

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
    } else {
      const rest = nextUnit ? getRemaining(useBuildingStore.getState(), nextUnit, yy, mm) : 0;
      setAmount(rest ? String(rest) : "");
      setMethod("card");
      setDate(jalaliToIso(today.year, today.month, today.day));
      setNote("");
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
  const resetDemo = useBuildingStore((s) => s.resetDemo);
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
    updateSettings({
      ...form,
      baseCharge: Number.isNaN(base) || base < 0 ? settings.baseCharge : base,
      perPerson: Number.isNaN(per) || per < 0 ? settings.perPerson : per,
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
        <Button type="submit" size="lg">
          ذخیره تنظیمات
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetDemo();
            close();
          }}
        >
          پاک کردن همه داده‌ها
        </Button>
      </form>
      {/* Outside the settings <form>: nested forms are invalid HTML and the
          browser would strip the inner ones, breaking both buttons. */}
      <AdminAccountSection />
    </Dialog>
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
