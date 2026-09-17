import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthTitle } from "@/lib/format";

export function MonthNav({
  year,
  month,
  onShift,
}: {
  year: number;
  month: number;
  onShift: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="icon" onClick={() => onShift(-1)} aria-label="ماه قبل">
        <ChevronRight />
      </Button>
      <p className="min-w-36 text-center font-display text-heading font-medium">
        {monthTitle(year, month)}
      </p>
      <Button type="button" variant="outline" size="icon" onClick={() => onShift(1)} aria-label="ماه بعد">
        <ChevronLeft />
      </Button>
    </div>
  );
}
