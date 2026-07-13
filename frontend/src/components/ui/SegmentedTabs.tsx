import { useRef } from "react";

export interface SegmentedTab {
  value: string;
  label: string;
}

export function SegmentedTabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly SegmentedTab[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === value),
  );

  const move = (index: number) => {
    const nextIndex = (index + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (!next) return;
    onChange(next.value);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-3 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border)] bg-white/85 p-1 xl:hidden"
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={`dashboard-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`dashboard-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                move(selectedIndex + 1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                move(selectedIndex - 1);
              }
              if (event.key === "Home") {
                event.preventDefault();
                move(0);
              }
              if (event.key === "End") {
                event.preventDefault();
                move(tabs.length - 1);
              }
            }}
            className={`pressable min-h-11 rounded-xl px-2 text-sm font-black transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${selected ? "bg-[var(--mother-blue-strong)] text-white shadow-sm" : "text-[var(--muted-text)] hover:bg-[var(--mother-blue-soft)]"}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
