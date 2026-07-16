import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/oshigoto", label: "きろく", end: true },
  { to: "/oshigoto/zukan", label: "ずかん", end: false },
  { to: "/oshigoto/usj", label: "USJ", end: false },
] as const;

export function OshigotoTabs() {
  return (
    <nav
      aria-label="おしごと画面の切り替え"
      className="mb-4 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--osh-line)] bg-[var(--osh-card)]/90 p-1 shadow-[var(--osh-shadow-sm)]"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `pressable flex min-h-10 items-center justify-center rounded-xl px-2 text-sm font-extrabold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] active:scale-[0.98] ${
              isActive
                ? "bg-[var(--osh-violet)] text-white shadow-sm"
                : "text-[var(--osh-ink-soft)] hover:bg-[var(--osh-violet-soft)]/60"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
