import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Plus, Settings, Wallet, X } from "lucide-react";
import { AppDialogs } from "@/components/app/dialogs";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { TodayStamp } from "@/components/app/today-stamp";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { hydrateBuilding, useBuildingStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "داشبورد" },
  { to: "/units", label: "واحدها" },
  { to: "/charges", label: "شارژ" },
  { to: "/expenses", label: "هزینه‌ها" },
  { to: "/report", label: "گزارش" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const openPayment = useBuildingStore((s) => s.openPayment);
  const openSettings = useBuildingStore((s) => s.openSettings);
  const buildingName = useBuildingStore((s) => s.settings.buildingName);
  const onLogin = pathname === "/login";
  const allowed = Boolean(user);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!allowed) return;
    void hydrateBuilding();
  }, [allowed]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (onLogin) return <>{children}</>;

  if (isPending) {
    return (
      <div className="min-h-svh bg-background">
        <div className="h-16 border-b border-border bg-background/90" />
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!allowed) return <RedirectToSignIn />;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">
              {buildingName}
            </span>
            <TodayStamp className="hidden max-w-[16rem] sm:inline" />
          </div>
          <nav className="hidden items-center gap-6 md:flex" aria-label="اصلی">
            {links.map((link) => {
              const active = link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "text-sm font-medium transition-colors duration-150",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserButton />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openSettings}
              aria-label="تنظیمات"
            >
              <Settings />
            </Button>
            <Button type="button" size="sm" className="hidden sm:inline-flex" onClick={() => openPayment()}>
              <Wallet />
              ثبت پرداخت
            </Button>
            <Button type="button" size="icon" className="sm:hidden" onClick={() => openPayment()} aria-label="ثبت پرداخت">
              <Plus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X /> : <Menu />}
              <span className="sr-only">{open ? "بستن منو" : "باز کردن منو"}</span>
            </Button>
          </div>
        </div>
        <TodayStamp className="block px-4 pb-2 sm:hidden" />
        <div hidden={!open} className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="موبایل">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex min-h-11 items-center rounded-md px-3 text-base font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <AppDialogs />
    </div>
  );
}
