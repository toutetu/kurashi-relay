import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/mama-kaji", label: "きろく", end: true },
  { to: "/mama-kaji/zukan", label: "おやつ図鑑", end: false },
] as const;

export function MamaKajiTabs() {
  return (
    <nav
      aria-label="家事手帖画面の切り替え"
      className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-[var(--mkj-line)] bg-[var(--mkj-card)]/90 p-1 shadow-[var(--mkj-shadow-sm)]"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `pressable flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-extrabold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] active:scale-[0.98] ${
              isActive
                ? "bg-[var(--mkj-rasp)] text-white shadow-sm"
                : "text-[var(--mkj-ink-soft)] hover:bg-[var(--mkj-rasp-soft)]/60"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
