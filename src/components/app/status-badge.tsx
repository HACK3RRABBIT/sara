import { STATUS_LABELS, type PayStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

const styles: Record<PayStatus, string> = {
  paid: "bg-muted text-muted-foreground",
  partial: "bg-accent text-accent-foreground",
  window: "bg-board text-board-foreground",
  upcoming: "bg-muted text-foreground",
  overdue: "bg-destructive text-destructive-foreground",
  none: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: PayStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium",
        styles[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
