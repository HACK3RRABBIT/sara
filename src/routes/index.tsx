import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RowMenuHost, useRowMenu } from "@/components/app/context-menu";
import { TodayStamp } from "@/components/app/today-stamp";
import { faNum, jalaliToday, monthTitle, toman } from "@/lib/format";
import { MONTHS_FA } from "@/lib/format";
import {
  STATUS_LABELS,
  fundBalance,
  getCharge,
  getPaid,
  getRemaining,
  getStatus,
  monthTotals,
  pendingHandoverTotal,
  sortUnits,
  totalDebt,
  unitDebt,
  useBuildingStore,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const units = useBuildingStore((s) => s.units);
  const settings = useBuildingStore((s) => s.settings);
  const state = useBuildingStore();
  const today = jalaliToday();

  // Charges are computed from each unit's occupant count the moment the
  // current month is viewed — no manual "issue" step. Only fills in units
  // missing a charge for this month; never touches an existing/edited one.
  useEffect(() => {
    if (!state.hydrated) return;
    state.ensureMonthCharges(today.year, today.month);
  }, [state, today.year, today.month]);

  const totals = monthTotals(state, today.year, today.month);
  const progress = totals.billed ? Math.round((totals.collected / totals.billed) * 100) : 0;

  const fund = fundBalance(state);
  const debt = totalDebt(state);
  const expected = fund + debt;
  const handover = pendingHandoverTotal(state) + settings.previousManagerReceivable;
  const managerDebt = settings.managerDebtToFund;

  const debtors = useMemo(() => {
    return sortUnits(units)
      .map((unit) => ({ unit, debt: unitDebt(state, unit.id) }))
      .filter((row) => row.debt > 0)
      .sort((a, b) => b.debt - a.debt);
  }, [units, state]);

  const yearRows = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return { month, ...monthTotals(state, today.year, month) };
    });
  }, [state, today.year]);

  const rows = useMemo(() => {
    return sortUnits(units).map((unit) => {
      const charge = getCharge(state, unit.id, today.year, today.month);
      const paid = getPaid(state, unit.id, today.year, today.month);
      const remain = getRemaining(state, unit.id, today.year, today.month);
      const billed = charge?.amount ?? 0;
      return {
        unit,
        paid,
        remain,
        billed,
        percent: billed ? Math.round((paid / billed) * 100) : 0,
        status: getStatus(state, unit.id, today.year, today.month, today),
      };
    });
  }, [units, state, today.year, today.month, today.day]);

  const menu = useRowMenu();
  function actionsFor(unitId: string, remain: number) {
    return [
      { label: "ویرایش این ماه", onSelect: () => state.openLedger({ unitId, year: today.year, month: today.month }) },
      { label: "ثبت پرداخت", onSelect: () => state.openPayment({ unitId, year: today.year, month: today.month }) },
      ...(remain > 0
        ? [{ label: "تسویه کامل مانده", onSelect: () => state.settleUnitMonth(unitId, today.year, today.month) }]
        : []),
    ];
  }

  return (
    <div className="flex flex-col gap-6">
      {managerDebt > 0 ? (
        <section className="rounded-2xl bg-destructive/10 px-4 py-4 text-destructive sm:px-6 sm:py-5">
          <h2 className="font-display text-heading font-medium">بدهی من به صندوق</h2>
          <p className="mt-1 text-sm">
            مبلغی که خودم از صندوق برداشته‌ام و هنوز برنگردانده‌ام — جدا از مطالبات ساکنان و مدیر قبلی.
          </p>
          <p className="mt-2 font-display text-xl font-medium tabular-nums">{toman(managerDebt)}</p>
        </section>
      ) : null}
      {debtors.length > 0 ? (
        <section className="rounded-2xl bg-destructive/10 px-4 py-4 text-destructive sm:px-6 sm:py-5">
          <h2 className="font-display text-heading font-medium">بدهکاران</h2>
          <ul className="mt-3 flex flex-col gap-1">
            {debtors.map(({ unit, debt: amount }) => (
              <li key={unit.id}>
                <Link
                  to="/units/$unitId"
                  params={{ unitId: unit.id }}
                  className="press flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 no-underline transition-colors duration-150 hover:bg-destructive/10"
                  onContextMenu={(event) =>
                    menu.onContextMenu(event, actionsFor(unit.id, getRemaining(state, unit.id, today.year, today.month)))
                  }
                  onPointerDown={(event) =>
                    menu.onPointerDown(event, actionsFor(unit.id, getRemaining(state, unit.id, today.year, today.month)))
                  }
                  onPointerMove={menu.onPointerMove}
                  onPointerUp={menu.onPointerUp}
                  onPointerCancel={menu.onPointerCancel}
                >
                  <span className="text-sm">
                    واحد {unit.number} · {unit.resident || "بدون ساکن"}
                  </span>
                  <span className="tabular-nums text-sm font-medium">{toman(amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl bg-board px-4 py-5 text-board-foreground sm:px-6 sm:py-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-board-foreground/55">{settings.buildingName}</p>
            <TodayStamp variant="hero" className="mt-2" />
            <h1 className="mt-4 font-display text-title font-medium text-board-foreground">
              {units.length ? `وضعیت واحدها · ${monthTitle(today.year, today.month)}` : "ساختمان خالی است"}
            </h1>
            {units.length ? (
              <p className="mt-1 text-xs text-board-foreground/45">
                روی هر واحد کلیک راست کنید یا انگشت را نگه دارید تا پرداخت و شارژ همان ماه را عوض کنید.
              </p>
            ) : null}
          </div>
          <dl className="grid grid-cols-3 gap-6 sm:w-80">
            <Stat label="پرداخت این ماه" value={faNum(totals.collected)} />
            <Stat label="بدهی این ماه" value={faNum(totals.outstanding)} />
            <Stat label="وصول" value={`${faNum(progress)}٪`} />
          </dl>
        </header>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-board-foreground/15">
          <div
            className="h-full rounded-full bg-board-foreground transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-board-foreground/45">مبالغ به تومان — نوار پر یعنی تسویه</p>

        <div className="mt-5 hidden grid-cols-12 gap-3 px-3 text-xs text-board-foreground/45 sm:grid">
          <p className="col-span-1">واحد</p>
          <p className="col-span-3">ساکن</p>
          <p className="col-span-4">وصول</p>
          <p className="col-span-2 text-end">پرداخت</p>
          <p className="col-span-2 text-end">بدهی</p>
        </div>

        <ol className="mt-1 flex flex-col gap-1">
          {rows.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-board-foreground/55">
              هنوز واحدی ثبت نشده. از صفحهٔ واحدها شروع کنید.
            </li>
          ) : (
            rows.map((row) => (
              <li key={row.unit.id}>
                <Link
                  to="/units/$unitId"
                  params={{ unitId: row.unit.id }}
                  className={cn(
                    "press grid min-h-11 grid-cols-12 items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 no-underline transition-colors duration-150",
                    row.status === "paid"
                      ? "bg-success/10 hover:bg-success/15"
                      : row.remain > 0
                        ? "bg-destructive/10 hover:bg-destructive/15"
                        : "hover:bg-board-foreground/10",
                  )}
                  onContextMenu={(event) => menu.onContextMenu(event, actionsFor(row.unit.id, row.remain))}
                  onPointerDown={(event) => menu.onPointerDown(event, actionsFor(row.unit.id, row.remain))}
                  onPointerMove={menu.onPointerMove}
                  onPointerUp={menu.onPointerUp}
                  onPointerCancel={menu.onPointerCancel}
                >
                  <span className="col-span-2 font-display text-xl tabular-nums sm:col-span-1">
                    {row.unit.number}
                  </span>
                  <span className="col-span-10 truncate text-sm sm:col-span-3">
                    {row.unit.resident || "بدون ساکن"}
                  </span>
                  <span className="col-span-12 sm:col-span-4">
                    <span className="flex h-2 overflow-hidden rounded-full bg-board-foreground/15">
                      <span
                        className={cn(
                          "h-full rounded-full",
                          row.status === "paid" ? "bg-success" : "bg-board-foreground",
                        )}
                        style={{ width: `${row.percent}%` }}
                      />
                    </span>
                  </span>
                  <span className="col-span-6 text-sm tabular-nums sm:col-span-2 sm:text-end">
                    <span className="sm:hidden text-board-foreground/45">پرداخت </span>
                    {faNum(row.paid)}
                  </span>
                  <span
                    className={cn(
                      "col-span-6 text-end text-sm tabular-nums",
                      row.status === "none"
                        ? "text-board-foreground/45"
                        : row.status === "paid"
                          ? "text-success"
                          : row.remain > 0
                            ? "text-destructive"
                            : "text-board-foreground/45",
                    )}
                  >
                    <span className="sm:hidden text-board-foreground/45">بدهی </span>
                    {row.status === "none" ? STATUS_LABELS.none : faNum(row.remain)}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ol>
      </section>

      <section className={cn("grid gap-3", handover > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
        <TreasuryStat label="موجودی صندوق" value={toman(fund)} />
        <TreasuryStat label="موجودی در صورت وصول کامل" value={toman(expected)} />
        <TreasuryStat label="کسری (مطالبات وصول‌نشده)" value={toman(debt)} tone={debt > 0 ? "debt" : undefined} />
        {handover > 0 ? (
          <TreasuryStat
            label="در انتظار تحویل از مدیر قبلی"
            value={toman(handover)}
            tone="debt"
          />
        ) : null}
      </section>

      <section className="overflow-x-auto rounded-2xl bg-card shadow-[var(--shadow-border)]">
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <h2 className="font-display text-heading font-medium">مرور سال {faNum(today.year)}</h2>
        </header>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-medium sm:px-6">ماه</th>
              <th className="px-4 py-3 text-start font-medium">شارژ صادرشده</th>
              <th className="px-4 py-3 text-start font-medium">وصول‌شده</th>
              <th className="px-4 py-3 text-start font-medium">مانده</th>
            </tr>
          </thead>
          <tbody>
            {yearRows.map((row) => {
              const settled = row.billed > 0 && row.outstanding === 0;
              const owing = row.outstanding > 0;
              return (
                <tr
                  key={row.month}
                  className={cn(
                    "border-b border-border last:border-0",
                    settled ? "bg-success/10" : owing ? "bg-destructive/10" : undefined,
                  )}
                >
                  <td className="px-4 py-3 font-medium sm:px-6">
                    {MONTHS_FA[row.month - 1]}
                    {row.month === today.month ? (
                      <span className="ms-2 text-xs text-muted-foreground">(این ماه)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.billed ? toman(row.billed) : "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{row.collected ? toman(row.collected) : "—"}</td>
                  <td
                    className={cn(
                      "px-4 py-3 tabular-nums",
                      settled ? "text-success" : owing ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {owing ? toman(row.outstanding) : settled ? "تسویه" : "—"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-board-foreground/55">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-medium tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

function TreasuryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "debt";
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-xl font-medium tabular-nums", tone === "debt" && "text-destructive")}>
        {value}
      </p>
    </div>
  );
}
