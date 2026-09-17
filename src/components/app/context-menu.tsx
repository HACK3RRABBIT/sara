import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ContextAction = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

type MenuState = {
  x: number;
  y: number;
  actions: ContextAction[];
};

export function ContextMenu({
  open,
  x,
  y,
  actions,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  actions: ContextAction[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!open || !node) return;
    const box = node.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + box.width > window.innerWidth - 8) left = window.innerWidth - box.width - 8;
    if (top + box.height > window.innerHeight - 8) top = window.innerHeight - box.height - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
  }, [open, x, y, actions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointer = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[60] min-w-48 rounded-xl bg-card py-1 text-card-foreground shadow-[var(--shadow-lift)] ring-1 ring-border"
      style={{ left: x, top: y }}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          className={cn(
            "flex min-h-11 w-full items-center px-4 text-start text-sm hover:bg-muted",
            action.danger && "text-destructive",
          )}
          onClick={() => {
            action.onSelect();
            onClose();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function useRowMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);

  function openAt(x: number, y: number, actions: ContextAction[]) {
    setMenu({ x, y, actions });
  }

  function onContextMenu(event: MouseEvent, actions: ContextAction[]) {
    event.preventDefault();
    event.stopPropagation();
    openAt(event.clientX, event.clientY, actions);
  }

  function onPointerDown(event: ReactPointerEvent, actions: ContextAction[]) {
    if (event.pointerType === "mouse") return;
    const x = event.clientX;
    const y = event.clientY;
    press.current = {
      x,
      y,
      timer: window.setTimeout(() => {
        press.current = null;
        openAt(x, y, actions);
      }, 480),
    };
  }

  function cancelPress() {
    if (press.current) {
      window.clearTimeout(press.current.timer);
      press.current = null;
    }
  }

  function onPointerMove(event: ReactPointerEvent) {
    const current = press.current;
    if (!current) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 12) cancelPress();
  }

  return {
    menu,
    close: () => setMenu(null),
    onContextMenu,
    onPointerDown,
    onPointerMove,
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress,
  };
}

export function RowMenuHost({
  menu,
  onClose,
}: {
  menu: MenuState | null;
  onClose: () => void;
}) {
  return (
    <ContextMenu
      open={Boolean(menu)}
      x={menu?.x ?? 0}
      y={menu?.y ?? 0}
      actions={menu?.actions ?? []}
      onClose={onClose}
    />
  );
}

export function MenuHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
