import { Link, usePage } from "@inertiajs/react";
import { NavLink } from "react-router-dom";
import { useAppPath, useAppPathContext } from "@/navigation/AppPathContext";

const spaTabs = [
  { spaPath: "/mama-kaji", label: "きろく", end: true },
  { spaPath: "/mama-kaji/zukan", label: "おやつ図鑑", end: false },
] as const;

function MamaKajiTabsSpa() {
  return (
    <nav
      aria-label="家事手帖画面の切り替え"
      className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-[var(--mkj-line)] bg-[var(--mkj-card)]/90 p-1 shadow-[var(--mkj-shadow-sm)]"
    >
      {spaTabs.map((tab) => (
        <NavLink
          key={tab.spaPath}
          to={tab.spaPath}
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

function MamaKajiTabsInertia() {
  const { url } = usePage();
  const pathname = new URL(url, "http://localhost").pathname;
  const resolvePath = useAppPath;

  return (
    <nav
      aria-label="家事手帖画面の切り替え"
      className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-[var(--mkj-line)] bg-[var(--mkj-card)]/90 p-1 shadow-[var(--mkj-shadow-sm)]"
    >
      {spaTabs.map((tab) => {
        const href = resolvePath(tab.spaPath);
        const isActive = tab.end
          ? pathname === href || pathname === `${href}/`
          : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={tab.spaPath}
            href={href}
            className={`pressable flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-extrabold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] active:scale-[0.98] ${
              isActive
                ? "bg-[var(--mkj-rasp)] text-white shadow-sm"
                : "text-[var(--mkj-ink-soft)] hover:bg-[var(--mkj-rasp-soft)]/60"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MamaKajiTabs() {
  const { mode } = useAppPathContext();

  return mode === "inertia" ? <MamaKajiTabsInertia /> : <MamaKajiTabsSpa />;
}
