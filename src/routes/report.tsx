import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MonthNav } from "@/components/app/month-nav";
import { Button } from "@/components/ui/button";
import {
  PAY_FROM,
  faNum,
  formatFaDate,
  jalaliToday,
  monthTitle,
  payWindowEnd,
  shiftMonth,
  toman,
} from "@/lib/format";
import {
  EXPENSE_LABELS,
  fundBalance,
  getPaid,
  getRemaining,
  monthTotals,
  useBuildingStore,
} from "@/lib/store";

export const Route = createFileRoute("/report")({ component: ReportPage });

function ReportPage() {
  const today = jalaliToday();
  const [{ year, month }, setCursor] = useState({ year: today.year, month: today.month });
  const state = useBuildingStore();
  const totals = monthTotals(state, year, month);
  const fund = fundBalance(state);
  const windowEnd = payWindowEnd(year, month);
  const monthExpenses = state.expenses.filter((item) => {
    const d = jalaliToday(new Date(item.date));
    return d.year === year && d.month === month;
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function exportAll() {
    setExporting(true);
    setExportError(null);
    try {
      // Do not export a cached snapshot: wait for queued autosaves, then read
      // the DB fresh so the workbook spans every session, not just this one.
      const { flushPendingSaves, freshBuilding } = await import("@/lib/store");
      await flushPendingSaves();
      const { revision: _revision, ...snapshot } = await freshBuilding();
      const { buildExportModel } = await import("@/lib/export-model");
      const model = buildExportModel(snapshot, { generatedAt: new Date() });
      const { buildWorkbook, downloadWorkbook } = await import("@/lib/excel-export");
      const bytes = await buildWorkbook(model);
      downloadWorkbook(model.fileName, bytes);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "خطا در تولید فایل اکسل");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-title font-medium">گزارش ماهانه</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            قابل چاپ برای تابلو اعلانات یا گروه ساکنین.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthNav
            year={year}
            month={month}
            onShift={(delta) => setCursor((cursor) => shiftMonth(cursor.year, cursor.month, delta))}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!state.hydrated || exporting}
            onClick={() => void exportAll()}
          >
            {exporting ? "در حال تولید..." : "خروجی اکسل (همه‌ی داده‌ها)"}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            چاپ
          </Button>
        </div>
        {exportError && <p className="text-sm text-red-600">{exportError}</p>}
      </div>

      <article className="rounded-2xl bg-card p-6 shadow-[var(--shadow-border)] sm:p-8 print:shadow-none">
        <header className="border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">{state.settings.buildingName}</p>
          <h2 className="mt-1 font-display text-title font-medium">
            صورتحساب {monthTitle(year, month)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{state.settings.address}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            مدیر: {state.settings.manager} · کارت {state.settings.cardNumber} · بانک {state.settings.bank}
          </p>
          <p className="mt-3 text-sm">
            شارژ مصوب: پایه {toman(state.settings.baseCharge)} + {toman(state.settings.perPerson)} هر نفر.
            مهلت واریز از {faNum(PAY_FROM)} تا {faNum(windowEnd)} هر ماه.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          <Cell label="شارژ صادرشده" value={toman(totals.billed)} />
          <Cell label="وصول‌شده" value={toman(totals.collected)} />
          <Cell label="مانده بدهی" value={toman(totals.outstanding)} />
          <Cell label="هزینه ماه" value={toman(totals.spent)} />
        </section>
        <p className="mt-4 text-sm">موجودی صندوق تا امروز: {toman(fund)}</p>

        <h3 className="mt-8 font-display text-heading font-medium">وضعیت واحدها</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 text-start font-medium">واحد</th>
                <th className="py-2 text-start font-medium">ساکن</th>
                <th className="py-2 text-start font-medium">نفر</th>
                <th className="py-2 text-start font-medium">شارژ</th>
                <th className="py-2 text-start font-medium">پرداخت</th>
                <th className="py-2 text-start font-medium">مانده</th>
              </tr>
            </thead>
            <tbody>
              {state.units.map((unit) => {
                const charge = state.charges.find(
                  (item) => item.unitId === unit.id && item.year === year && item.month === month,
                );
                return (
                  <tr key={unit.id} className="border-b border-border last:border-0">
                    <td className="py-2">{unit.number}</td>
                    <td className="py-2">{unit.resident}</td>
                    <td className="py-2 tabular-nums">{faNum(unit.occupants)}</td>
                    <td className="py-2 tabular-nums">{charge ? toman(charge.amount) : "—"}</td>
                    <td className="py-2 tabular-nums">{toman(getPaid(state, unit.id, year, month))}</td>
                    <td className="py-2 tabular-nums">
                      {toman(getRemaining(state, unit.id, year, month))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 font-display text-heading font-medium">هزینه‌ها</h3>
        {monthExpenses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">این ماه هزینه‌ای ثبت نشده.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {monthExpenses.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 border-b border-border py-2">
                <span>
                  {item.title} · {EXPENSE_LABELS[item.category]} · {formatFaDate(item.date)}
                </span>
                <span className="tabular-nums">{toman(item.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
