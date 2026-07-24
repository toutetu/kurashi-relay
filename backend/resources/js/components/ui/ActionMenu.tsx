import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button";

export type ActionMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export function ActionMenu({
  label = "その他の操作",
  items,
  disabled = false,
}: {
  label?: string;
  items: ActionMenuItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        purpose="low"
        tone="default"
        size="compact"
        icon={MoreHorizontal}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className="!min-h-11 !px-2"
      />
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--card-shadow)]"
        >
          {items.map((item) => (
            <Button
              key={item.id}
              role="menuitem"
              purpose="secondary"
              tone={item.tone ?? "default"}
              size="compact"
              disabled={disabled || item.disabled}
              className="mb-1 w-full justify-start last:mb-0"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
