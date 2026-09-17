import { faNum, formatFaFullDate, formatFaWeekday, jalaliToday, MONTHS_FA } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TodayStamp({
  className,
  variant = "header",
}: {
  className?: string;
  variant?: "header" | "hero" | "login";
}) {
  const today = jalaliToday();
  const weekday = formatFaWeekday();
  const dateLine = `${faNum(today.day)} ${MONTHS_FA[today.month - 1]} ${faNum(today.year)}`;

  if (variant === "hero") {
    return (
      <p className={cn("text-board-foreground", className)} dir="rtl">
        <span className="block font-display text-3xl font-medium leading-tight sm:text-4xl">
          امروز {weekday}
        </span>
        <span className="mt-1 block text-sm text-board-foreground/60">{dateLine}</span>
      </p>
    );
  }

  if (variant === "login") {
    return (
      <p className={cn("text-sm text-board-foreground/70", className)} dir="rtl">
        {formatFaFullDate()}
      </p>
    );
  }

  return (
    <span className={cn("min-w-0 truncate text-xs text-muted-foreground", className)} dir="rtl">
      امروز {weekday} · {dateLine}
    </span>
  );
}
