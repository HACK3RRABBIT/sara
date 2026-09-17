import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chargeAmount, faNum, jalaliToday, toman } from "@/lib/format";
import { getRemaining, getStatus, MAX_UNITS, sortUnits, useBuildingStore } from "@/lib/store";

export const Route = createFileRoute("/units")({ component: UnitsPage });

function UnitsPage() {
  const state = useBuildingStore();
  const today = jalaliToday();
  const [query, setQuery] = useState("");
  const units = useMemo(() => {
    const q = query.trim();
    return sortUnits(state.units).filter(
      (unit) =>
        !q ||
        unit.number.includes(q) ||
        unit.resident.includes(q) ||
        unit.phone.includes(q) ||
        (unit.note ?? "").includes(q),
    );
  }, [state.units, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-title font-medium">واحدها</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            ده واحد بیشتر نیست، شماره ۱ تا ۱۰. {faNum(state.units.length)} واحد ثبت شده — روی پایگاه داده ذخیره می‌شود.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجوی واحد یا ساکن"
            className="sm:w-56"
          />
          {state.units.length < MAX_UNITS ? (
            <Button type="button" onClick={() => state.addUnit()}>
              <Plus />
              واحد جدید
            </Button>
          ) : null}
        </div>
      </div>

      {units.length === 0 ? (
        <p className="rounded-2xl bg-card px-5 py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-border)]">
          هنوز واحدی نیست. «واحد جدید» را بزنید.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {units.map((unit) => {
            const remaining = getRemaining(state, unit.id, today.year, today.month);
            const amount = chargeAmount(
              state.settings.baseCharge,
              state.settings.perPerson,
              unit.occupants,
            );
            return (
              <li key={unit.id}>
                <Link
                  to="/units/$unitId"
                  params={{ unitId: unit.id }}
                  className="flex min-h-28 flex-col gap-2 rounded-2xl bg-card p-5 no-underline shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-heading font-medium">واحد {unit.number}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {unit.resident || "ساکن ثبت نشده"} · طبقه {faNum(unit.floor)} · {faNum(unit.occupants)} نفر
                      </p>
                    </div>
                    <StatusBadge status={getStatus(state, unit.id, today.year, today.month, today)} />
                  </div>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    شارژ {toman(amount)} · مانده این ماه {toman(remaining)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
