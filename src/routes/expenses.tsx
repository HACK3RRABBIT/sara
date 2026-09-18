import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RowMenuHost, useRowMenu } from "@/components/app/context-menu";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { formatFaDate, jalaliToday, toman } from "@/lib/format";
import { EXPENSE_LABELS, useBuildingStore, type ExpenseCategory } from "@/lib/store";

export const Route = createFileRoute("/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  const expenses = useBuildingStore((s) => s.expenses);
  const removeExpense = useBuildingStore((s) => s.removeExpense);
  const openExpense = useBuildingStore((s) => s.openExpense);
  const [category, setCategory] = useState<ExpenseCategory | "all">("all");
  const [pending, setPending] = useState<string | null>(null);
  const menu = useRowMenu();

  const rows = useMemo(() => {
    return [...expenses]
      .filter((item) => category === "all" || item.category === category)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, category]);
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  const today = jalaliToday();
  const monthSpend = expenses
    .filter((item) => {
      const d = jalaliToday(new Date(item.date));
      return d.year === today.year && d.month === today.month;
    })
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-title font-medium">هزینه‌های ساختمان</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            این ماه {toman(monthSpend)} خرج شده. مجموع فهرست فیلترشده {toman(total)}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            روی هر هزینه کلیک راست کنید یا انگشت را نگه دارید تا حذف کنید.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <NativeSelect
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory | "all")}
            className="sm:w-48"
          >
            <option value="all">همه دسته‌ها</option>
            {Object.entries(EXPENSE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </NativeSelect>
          <Button type="button" onClick={openExpense}>
            هزینه جدید
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card px-5 py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-border)]">
          هزینه‌ای در این دسته نیست.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((item) => (
            <li
              key={item.id}
              className="press flex select-none flex-col gap-3 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:flex-row sm:items-center sm:justify-between"
              onContextMenu={(event) =>
                menu.onContextMenu(event, [{ label: "حذف", onSelect: () => setPending(item.id), danger: true }])
              }
              onPointerDown={(event) =>
                menu.onPointerDown(event, [{ label: "حذف", onSelect: () => setPending(item.id), danger: true }])
              }
              onPointerMove={menu.onPointerMove}
              onPointerUp={menu.onPointerUp}
              onPointerCancel={menu.onPointerCancel}
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {EXPENSE_LABELS[item.category]} · {formatFaDate(item.date)}
                  {item.vendor ? ` · ${item.vendor}` : ""}
                </p>
                {item.note ? <p className="mt-1 text-sm text-muted-foreground">{item.note}</p> : null}
              </div>
              <div className="flex items-center gap-3" onPointerDown={(event) => event.stopPropagation()}>
                <p className="font-display text-xl font-medium">{toman(item.amount)}</p>
                {pending === item.id ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>
                      انصراف
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        removeExpense(item.id);
                        setPending(null);
                      }}
                    >
                      حذف شود
                    </Button>
                  </div>
                ) : (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPending(item.id)}>
                    حذف
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <RowMenuHost menu={menu.menu} onClose={menu.close} />
    </div>
  );
}
