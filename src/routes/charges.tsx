import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MonthNav } from "@/components/app/month-nav";
import { RowMenuHost, useRowMenu } from "@/components/app/context-menu";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  PAY_FROM,
  chargeAmount,
  faNum,
  formatFaDate,
  jalaliToday,
  monthTitle,
  payWindowEnd,
  shiftMonth,
  toman,
} from "@/lib/format";
import {
  METHOD_LABELS,
  getCharge,
  getPaid,
  getRemaining,
  getStatus,
  monthTotals,
  reminderText,
  sortUnits,
  useBuildingStore,
  type Unit,
} from "@/lib/store";

export const Route = createFileRoute("/charges")({ component: ChargesPage });

function ChargesPage() {
  const today = jalaliToday();
  const [{ year, month }, setCursor] = useState({ year: today.year, month: today.month });
  const state = useBuildingStore();
  const totals = monthTotals(state, year, month);
  const issued = state.charges.some((charge) => charge.year === year && charge.month === month);
  const [message, setMessage] = useState<string | null>(null);
  const windowEnd = payWindowEnd(year, month);
  const menu = useRowMenu();

  function issue() {
    const result = state.issueCharges(year, month);
    setMessage(
      result.ok
        ? `شارژ ${monthTitle(year, month)} برای ${new Intl.NumberFormat("fa-IR").format(state.units.length)} واحد صادر شد.`
        : (result.reason ?? null),
    );
  }

  async function copyReminders() {
    const lines = state.units
      .filter((unit) => getRemaining(state, unit.id, year, month) > 0)
      .map((unit) => reminderText(state, unit, year, month));
    if (!lines.length) {
      setMessage("برای این ماه بدهکاری نمانده.");
      return;
    }
    await navigator.clipboard.writeText(lines.join("\n\n"));
    setMessage("متن یادآوری بدهکاران کپی شد.");
  }

  function actionsFor(unit: Unit) {
    const remain = getRemaining(state, unit.id, year, month);
    const paid = getPaid(state, unit.id, year, month);
    return [
      {
        label: "ویرایش این ماه",
        onSelect: () => state.openLedger({ unitId: unit.id, year, month }),
      },
      {
        label: "ثبت پرداخت",
        onSelect: () => state.openPayment({ unitId: unit.id, year, month }),
      },
      {
        label: "تسویه کامل مانده",
        onSelect: () => state.settleUnitMonth(unit.id, year, month),
      },
      {
        label: "پاک کردن پرداخت‌ها",
        onSelect: () => state.clearMonthPayments(unit.id, year, month),
        danger: paid > 0,
      },
    ].filter((item) => {
      if (item.label === "تسویه کامل مانده") return remain > 0;
      if (item.label === "پاک کردن پرداخت‌ها") return paid > 0;
      return true;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-title font-medium">شارژ ماهانه</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            پایه {toman(state.settings.baseCharge)} + {toman(state.settings.perPerson)} هر نفر. مهلت پرداخت از{" "}
            {faNum(PAY_FROM)} تا {faNum(windowEnd)} {monthTitle(year, month)}.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            روی هر واحد کلیک راست کنید یا انگشت را نگه دارید تا پرداخت و شارژ همان ماه را عوض کنید.
          </p>
        </div>
        <MonthNav
          year={year}
          month={month}
          onShift={(delta) => setCursor((cursor) => shiftMonth(cursor.year, cursor.month, delta))}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={issue} disabled={issued}>
          {issued ? "شارژ این ماه صادر شده" : "صدور شارژ این ماه"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void copyReminders()}>
          کپی یادآوری بدهکاران
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Mini label="صادرشده" value={toman(totals.billed)} />
        <Mini label="وصول‌شده" value={toman(totals.collected)} />
        <Mini label="مانده" value={toman(totals.outstanding)} />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-[var(--shadow-border)]">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-medium">واحد</th>
              <th className="px-4 py-3 text-start font-medium">ساکن</th>
              <th className="px-4 py-3 text-start font-medium">نفرات</th>
              <th className="px-4 py-3 text-start font-medium">شارژ</th>
              <th className="px-4 py-3 text-start font-medium">پرداختی‌ها</th>
              <th className="px-4 py-3 text-start font-medium">مانده</th>
              <th className="px-4 py-3 text-start font-medium">وضعیت</th>
              <th className="px-4 py-3 text-start font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {sortUnits(state.units).map((unit) => {
              const charge = getCharge(state, unit.id, year, month);
              const formula = chargeAmount(
                state.settings.baseCharge,
                state.settings.perPerson,
                unit.occupants,
              );
              const amount = charge?.amount ?? formula;
              const paid = getPaid(state, unit.id, year, month);
              const remaining = getRemaining(state, unit.id, year, month);
              const status = getStatus(state, unit.id, year, month, today);
              const pays = state.payments
                .filter((item) => item.unitId === unit.id && item.year === year && item.month === month)
                .sort((a, b) => a.date.localeCompare(b.date));
              const actions = actionsFor(unit);
              return (
                <tr
                  key={unit.id}
                  className="select-none border-b border-border last:border-0 hover:bg-muted/50"
                  onContextMenu={(event) => menu.onContextMenu(event, actions)}
                  onPointerDown={(event) => menu.onPointerDown(event, actions)}
                  onPointerMove={menu.onPointerMove}
                  onPointerUp={menu.onPointerUp}
                  onPointerCancel={menu.onPointerCancel}
                  onDoubleClick={() => state.openLedger({ unitId: unit.id, year, month })}
                >
                  <td className="px-4 py-3 font-medium">{unit.number}</td>
                  <td className="px-4 py-3">{unit.resident}</td>
                  <td className="px-4 py-3 tabular-nums">{faNum(unit.occupants)}</td>
                  <td className="px-4 py-3 tabular-nums">{charge ? toman(amount) : "—"}</td>
                  <td className="px-4 py-3">
                    <p className="tabular-nums">{toman(paid)}</p>
                    {pays.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">بدون پرداخت</p>
                    ) : (
                      pays.map((payment) => (
                        <button
                          key={payment.id}
                          type="button"
                          className="mt-1 block text-start text-xs text-muted-foreground hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            state.openLedger({ unitId: unit.id, year, month });
                          }}
                        >
                          {formatFaDate(payment.date)} · {toman(payment.amount)} · {METHOD_LABELS[payment.method]}
                        </button>
                      ))
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{toman(remaining)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => state.openLedger({ unitId: unit.id, year, month })}
                    >
                      ویرایش
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <RowMenuHost menu={menu.menu} onClose={menu.close} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-xl font-medium">{value}</p>
    </div>
  );
}
