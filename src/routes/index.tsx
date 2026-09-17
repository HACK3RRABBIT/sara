import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TodayStamp } from "@/components/app/today-stamp";
import { faNum, jalaliToday, monthTitle } from "@/lib/format";
import {
  STATUS_LABELS,
  getCharge,
  getPaid,
  getRemaining,
  getStatus,
  monthTotals,
  sortUnits,
  useBuildingStore,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const units = useBuildingStore((s) => s.units);
  const settings = useBuildingStore((s) => s.settings);
  const state = useBuildingStore();
  const today = jalaliToday();
  const totals = monthTotals(state, today.year, today.month);
  const progress = totals.billed ? Math.round((totals.collected / totals.billed) * 100) : 0;

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

  return (
    <section className="rounded-2xl bg-board px-4 py-5 text-board-foreground sm:px-6 sm:py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-board-foreground/55">{settings.buildingName}</p>
          <TodayStamp variant="hero" className="mt-2" />
          <h1 className="mt-4 font-display text-title font-medium text-board-foreground">
            {units.length ? `وضعیت واحدها · ${monthTitle(today.year, today.month)}` : "ساختمان خالی است"}
          </h1>
        </div>
        <dl className="grid grid-cols-3 gap-6 sm:w-80">
          <Stat label="پرداخت" value={faNum(totals.collected)} />
          <Stat label="بدهی" value={faNum(totals.outstanding)} />
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
                "grid min-h-11 grid-cols-12 items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 no-underline transition-colors duration-150",
                row.remain > 0 ? "bg-board-foreground/10 hover:bg-board-foreground/15" : "hover:bg-board-foreground/10",
              )}
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
                    className="h-full rounded-full bg-board-foreground"
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
                  row.status === "none" ? "text-board-foreground/45" : row.remain > 0 ? "text-board-foreground" : "text-board-foreground/45",
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

