import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { RowMenuHost, useRowMenu } from "@/components/app/context-menu";
import { StatusBadge } from "@/components/app/status-badge";
import { UnitForm } from "@/components/app/unit-form";
import { chargeAmount, faNum, formatFaDate, jalaliToday, monthTitle, money, rial } from "@/lib/format";
import {
  METHOD_LABELS,
  getPaid,
  getRemaining,
  getStatus,
  useBuildingStore,
} from "@/lib/store";

export const Route = createFileRoute("/units_/$unitId")({ component: UnitDetailPage });

function UnitDetailPage() {
  const { unitId } = Route.useParams();
  const navigate = useNavigate();
  const state = useBuildingStore();
  const unit = state.units.find((item) => item.id === unitId);
  const today = jalaliToday();
  const [pending, setPending] = useState<string | null>(null);
  const menu = useRowMenu();

  if (!unit) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center shadow-[var(--shadow-border)]">
        <p>این واحد پیدا نشد.</p>
        <Button asChild className="mt-4">
          <Link to="/units">بازگشت به واحدها</Link>
        </Button>
      </div>
    );
  }

  const charges = state.charges
    .filter((charge) => charge.unitId === unit.id)
    .sort((a, b) => b.year - a.year || b.month - a.month);
  const payments = state.payments
    .filter((payment) => payment.unitId === unit.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const amount = chargeAmount(state.settings.baseCharge, state.settings.perPerson, unit.occupants);
  const title = unit.number.trim() || "بدون نام";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/units" className="text-sm text-muted-foreground hover:text-foreground">
          واحدها
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-title font-medium">واحد {title}</h1>
            <p className="mt-2 text-muted-foreground">
              {unit.resident || "ساکن ثبت نشده"} · طبقه {faNum(unit.floor)} · {faNum(unit.occupants)} نفر
            </p>
            {unit.phone ? (
              <a href={`tel:${unit.phone}`} className="mt-1 inline-block min-h-11 text-sm" dir="ltr">
                {unit.phone}
              </a>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              state.openPayment({ unitId: unit.id, year: today.year, month: today.month })
            }
          >
            ثبت پرداخت
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="text-sm text-muted-foreground">شارژ مصوب ماه بعد</p>
          <p className="mt-2 font-display text-2xl font-medium">{money(amount)}</p>
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="text-sm text-muted-foreground">مانده این ماه</p>
          <p className="mt-2 font-display text-2xl font-medium">
            {money(getRemaining(state, unit.id, today.year, today.month))}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
          <p className="text-sm text-muted-foreground">وضعیت</p>
          <div className="mt-3">
            <StatusBadge status={getStatus(state, unit.id, today.year, today.month, today)} />
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-heading font-medium">مشخصات واحد</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          هر تغییری ذخیره می‌شود و دفعهٔ بعد همین‌جا می‌ماند.
        </p>
        <UnitForm
          unit={unit}
          settings={state.settings}
          onSave={(patch) => state.updateUnit(unit.id, patch)}
          onDelete={() => {
            state.removeUnit(unit.id);
            void navigate({ to: "/units" });
          }}
        />
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-heading font-medium">پرداختی‌ها</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          هر پرداخت را می‌توانید عوض کنید یا حذف کنید — یا روی آن کلیک راست کنید.
        </p>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">پرداختی برای این واحد ثبت نشده.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payments.map((payment) => {
              const actions = [
                {
                  label: "ویرایش",
                  onSelect: () =>
                    state.openPayment({
                      unitId: unit.id,
                      year: payment.year,
                      month: payment.month,
                      paymentId: payment.id,
                    }),
                },
                { label: "حذف", onSelect: () => setPending(payment.id), danger: true },
              ];
              return (
                <li
                  key={payment.id}
                  className="press flex select-none flex-col gap-3 rounded-xl bg-muted/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  onContextMenu={(event) => menu.onContextMenu(event, actions)}
                  onPointerDown={(event) => menu.onPointerDown(event, actions)}
                  onPointerMove={menu.onPointerMove}
                  onPointerUp={menu.onPointerUp}
                  onPointerCancel={menu.onPointerCancel}
                >
                  <div>
                    <p className="font-medium tabular-nums">{money(payment.amount)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {monthTitle(payment.year, payment.month)} · {formatFaDate(payment.date)} ·{" "}
                      {METHOD_LABELS[payment.method]}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </p>
                    {payment.notReachedFund ? (
                      <p className="mt-1 text-xs text-destructive">به صندوق نرسیده</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2" onPointerDown={(event) => event.stopPropagation()}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        state.openPayment({
                          unitId: unit.id,
                          year: payment.year,
                          month: payment.month,
                          paymentId: payment.id,
                        })
                      }
                    >
                      ویرایش
                    </Button>
                    {pending === payment.id ? (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>
                          انصراف
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            state.removePayment(payment.id);
                            setPending(null);
                          }}
                        >
                          حذف شود
                        </Button>
                      </>
                    ) : (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPending(payment.id)}>
                        حذف
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-x-auto rounded-2xl bg-card shadow-[var(--shadow-border)]">
        <header className="border-b border-border px-4 py-3">
          <h2 className="font-display text-heading font-medium">سابقهٔ شارژ</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            روی هر ماه کلیک راست کنید یا انگشت را نگه دارید تا ویرایش یا پرداخت را باز کنید.
          </p>
        </header>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-medium">ماه</th>
              <th className="px-4 py-3 text-start font-medium">شارژ</th>
              <th className="px-4 py-3 text-start font-medium">پرداخت</th>
              <th className="px-4 py-3 text-start font-medium">مانده</th>
              <th className="px-4 py-3 text-start font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((charge) => {
              const paid = getPaid(state, unit.id, charge.year, charge.month);
              const remaining = getRemaining(state, unit.id, charge.year, charge.month);
              const actions = [
                {
                  label: "ویرایش این ماه",
                  onSelect: () => state.openLedger({ unitId: unit.id, year: charge.year, month: charge.month }),
                },
                {
                  label: "ثبت پرداخت",
                  onSelect: () => state.openPayment({ unitId: unit.id, year: charge.year, month: charge.month }),
                },
              ];
              return (
                <tr
                  key={charge.id}
                  className="press select-none border-b border-border last:border-0 hover:bg-muted/50"
                  onContextMenu={(event) => menu.onContextMenu(event, actions)}
                  onPointerDown={(event) => menu.onPointerDown(event, actions)}
                  onPointerMove={menu.onPointerMove}
                  onPointerUp={menu.onPointerUp}
                  onPointerCancel={menu.onPointerCancel}
                  onDoubleClick={() => state.openLedger({ unitId: unit.id, year: charge.year, month: charge.month })}
                >
                  <td className="px-4 py-3">{monthTitle(charge.year, charge.month)}</td>
                  <td className="px-4 py-3 tabular-nums">{rial(charge.amount)}</td>
                  <td className="px-4 py-3 tabular-nums">{rial(paid)}</td>
                  <td className="px-4 py-3 tabular-nums">{rial(remaining)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={getStatus(state, unit.id, charge.year, charge.month, today)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <RowMenuHost menu={menu.menu} onClose={menu.close} />
    </div>
  );
}
