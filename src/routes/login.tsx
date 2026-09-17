import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { TodayStamp } from "@/components/app/today-stamp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { getAuthStatus } from "@/lib/auth-status";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void getAuthStatus()
      .then((status) => {
        if (alive) setNeedsSetup(status.needsSetup);
      })
      .catch(() => {
        if (alive) setNeedsSetup(false); // fail closed: show plain sign-in
      });
    return () => {
      alive = false;
    };
  }, []);

  if (isPending || needsSetup === null) {
    return (
      <main className="grid min-h-svh place-items-center bg-board px-4">
        <div className="h-12 w-48 animate-pulse rounded-lg bg-background/10" />
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  const firstRun = needsSetup;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) {
      setError("ایمیل را بنویسید.");
      return;
    }
    if (!password) {
      setError("گذرواژه را بنویسید.");
      return;
    }
    if (firstRun) {
      if (password.length < 8) {
        setError("گذرواژه باید دست‌کم ۸ نویسه باشد.");
        return;
      }
      if (password !== confirm) {
        setError("گذرواژه و تکرارش یکسان نیستند.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      if (firstRun) {
        // First-run setup: register the administrator account. The server only
        // accepts this while no admin exists (see getAuthStatus callers).
        const created = await authClient.signUp.email({
          email: nextEmail,
          password,
          name: "مدیر",
          callbackURL: "/",
        });
        if (created.error) {
          setError("ثبت مدیر انجام نشد. دوباره تلاش کنید.");
          return;
        }
        await navigate({ to: "/" });
        return;
      }
      const signedIn = await authClient.signIn.email({
        email: nextEmail,
        password,
        callbackURL: "/",
      });
      if (signedIn.error) {
        setError("ایمیل یا گذرواژه نادرست است.");
        return;
      }
      await navigate({ to: "/" });
    } catch {
      setError("ورود انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-svh place-items-center bg-board px-4 text-board-foreground">
      <div className="absolute top-3 start-3 sm:top-4 sm:start-4">
        <ThemeToggle className="text-board-foreground hover:bg-board-foreground/10 hover:text-board-foreground" />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-board-foreground">
          <Logo className="text-board-foreground" />
        </div>
        <h1 className="mt-6 font-display text-title font-medium">
          {firstRun ? "ساخت حساب مدیر" : "ورود"}
        </h1>
        <TodayStamp variant="login" className="mt-2" />
        <p className="mt-2 text-sm text-board-foreground/65">
          {firstRun
            ? "اولین ورود است. ایمیل و گذرواژهٔ مدیر را بسازید."
            : "با ایمیل و گذرواژه وارد شوید."}
        </p>
        <form onSubmit={(event) => void onSubmit(event)} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-board-foreground">
              ایمیل
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-board-foreground">
              گذرواژه
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={firstRun ? "new-password" : "current-password"}
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {firstRun ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm" className="text-board-foreground">
                تکرار گذرواژه
              </Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                dir="ltr"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-board-foreground" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="inverted" size="lg" disabled={busy}>
            {busy
              ? firstRun
                ? "در حال ساخت حساب…"
                : "در حال ورود…"
              : firstRun
                ? "ثبت مدیر"
                : "ورود"}
          </Button>
        </form>
      </div>
    </main>
  );
}
