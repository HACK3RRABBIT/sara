import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { getTheme, subscribeTheme, toggleTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "light" as const);
  const dark = theme === "dark";

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    // The reveal expands from wherever this button actually is, so tap it in
    // a corner and the new theme sweeps in from that corner.
    const rect = event.currentTarget.getBoundingClientRect();
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={onClick}
      aria-label={dark ? "حالت روشن" : "حالت تاریک"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
