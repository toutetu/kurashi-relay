import {
  BarChart3,
  CalendarDays,
  ClipboardPenLine,
  FileText,
  Heart,
  Gamepad2,
  ListChecks,
  Home,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const navigation = [
  { to: "/", label: "ホーム", icon: Home },
  { to: "/schedule-comparison", label: "予定と実績", icon: BarChart3 },
  { to: "/schedule", label: "今日の予定", icon: CalendarDays },
  { to: "/records", label: "記録", icon: ClipboardPenLine },
  { to: "/child-plan", label: "娘の状態", icon: Heart },
  { to: "/summary", label: "今日のまとめ", icon: ListChecks },
  { to: "/last-war", label: "ラストウォー", icon: Gamepad2 },
  { to: "/support", label: "支援", icon: Users },
  { to: "/reports", label: "レポート", icon: FileText },
  { to: "/settings", label: "設定", icon: Settings },
];

const mobileNavigation = navigation
  .filter((item) => item.to !== "/summary" && item.to !== "/last-war")
  .slice(0, 6);

const pageTitles: Record<string, string> = {
  "/": "ホーム",
  "/schedule-comparison": "今日の予定と実績",
  "/schedule": "今日の予定",
  "/records": "記録",
  "/child-plan": "娘の状態・今日の作戦",
  "/summary": "今日のまとめ",
  "/last-war": "ラストウォー",
  "/support": "支援",
  "/reports": "レポート",
  "/settings": "設定",
};

function NavigationItem({
  to,
  label,
  icon: Icon,
  onClick,
}: (typeof navigation)[number] & { onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `pressable flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
          isActive
            ? "bg-[var(--mother-blue-soft)] text-[var(--mother-blue-strong)] shadow-sm"
            : "text-[var(--muted-text)] hover:bg-white hover:text-[var(--text)]"
        }`
      }
    >
      <Icon aria-hidden="true" size={20} />
      <span>{label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const wasMenuOpen = useRef(false);
  const pageTitle = pageTitles[pathname] ?? "くらしリレー";

  useEffect(() => {
    if (!menuOpen) {
      if (wasMenuOpen.current) menuButtonRef.current?.focus();
      wasMenuOpen.current = false;
      return;
    }

    wasMenuOpen.current = true;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const getFocusableElements = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    getFocusableElements()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <div className="min-h-svh bg-[var(--page-background)] text-[var(--text)]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[60] -translate-y-24 rounded-lg bg-[var(--text)] px-4 py-2 font-bold text-white focus:translate-y-0"
      >
        本文へ移動
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-17 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMenuOpen((open) => !open)}
              className="pressable grid size-11 place-items-center rounded-xl text-[var(--muted-text)] hover:bg-[var(--mother-blue-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] xl:hidden"
            >
              {menuOpen ? (
                <X aria-hidden="true" />
              ) : (
                <Menu aria-hidden="true" />
              )}
            </button>
            <NavLink
              to="/"
              className="pressable flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[var(--mother-red)] via-[var(--mother-yellow)] to-[var(--mother-blue)] text-white shadow-sm">
                <Sparkles aria-hidden="true" size={21} />
              </span>
              <span className="hidden text-lg font-black tracking-tight sm:inline">
                くらしリレー
              </span>
            </NavLink>
          </div>
          <p className="truncate text-sm font-bold text-[var(--muted-text)] sm:text-base">
            {pageTitle}
          </p>
          <NavLink
            to="/settings"
            aria-label="設定を開く"
            className="pressable grid size-11 shrink-0 place-items-center rounded-xl text-[var(--muted-text)] hover:bg-[var(--mother-blue-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] xl:hidden"
          >
            <Settings aria-hidden="true" size={21} />
          </NavLink>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-[var(--text)]/25 xl:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        ref={drawerRef}
        id="mobile-drawer"
        aria-label="メニュー"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`fixed bottom-0 left-0 top-17 z-40 w-68 border-r border-[var(--border)] bg-[var(--page-background)] p-4 shadow-xl transition-transform xl:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavigationItem
              key={item.to}
              {...item}
              onClick={() => setMenuOpen(false)}
            />
          ))}
        </nav>
      </aside>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-17 hidden h-[calc(100vh-4.25rem)] w-64 shrink-0 border-r border-[var(--border)] bg-[var(--page-background)] p-5 xl:block">
          <nav aria-label="メインメニュー" className="space-y-1">
            {navigation.map((item) => (
              <NavigationItem key={item.to} {...item} />
            ))}
          </nav>
          <div className="absolute bottom-6 left-5 right-5 rounded-2xl border border-[var(--daughter-purple-soft)] bg-gradient-to-br from-[var(--daughter-blue)] to-[var(--daughter-purple-soft)] p-4 text-sm text-[var(--daughter-text)]">
            <p className="font-black">今日も、ひとつずつ</p>
            <p className="mt-1 leading-relaxed">
              待機や回復も、大切なくらしの時間です。
            </p>
          </div>
        </aside>

        <main
          id="main-content"
          className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 md:pt-7 xl:pb-6 xl:px-8 xl:pt-3"
        >
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="モバイルメニュー"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[var(--border)] bg-white/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(40,51,74,0.08)] xl:hidden"
      >
        {mobileNavigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `pressable flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[0.66rem] font-bold transition focus-visible:outline-3 focus-visible:outline-[var(--focus)] sm:text-xs ${
                isActive
                  ? "bg-[var(--mother-blue-soft)] text-[var(--mother-blue-strong)]"
                  : "text-[var(--muted-text)]"
              }`
            }
          >
            <Icon aria-hidden="true" size={20} />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
