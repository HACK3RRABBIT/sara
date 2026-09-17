import { Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9 12.5h14M9 16.5h10.5M9 20.5h6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("inline-flex items-center gap-2 text-foreground no-underline", className)}
    >
      <LogoMark />
      <span className="text-base font-semibold">{APP_NAME}</span>
    </Link>
  );
}
