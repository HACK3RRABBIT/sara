import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { getTheme, subscribeTheme, toggleTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light" as const);
  const dark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={toggleTheme}
      aria-label={dark ? "حالت روشن" : "حالت تاریک"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
