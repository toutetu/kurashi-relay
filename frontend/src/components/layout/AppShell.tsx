import {
  BarChart3,
  CalendarDays,
  ClipboardPenLine,
  FileText,
  Heart,
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
  { to: "/child-plan", label: "娘の希望", icon: Heart },
  { to: "/support", label: "支援", icon: Users },
  { to: "/reports", label: "レポート", icon: FileText },
  { to: "/settings", label: "設定", icon: Settings },
];

const mobileNavigation = navigation.slice(0, 6);

const pageTitles: Record<string, string> = {
  "/": "ホーム",
  "/schedule-comparison": "今日の予定と実績",
  "/schedule": "今日の予定",
  "/records": "記録",
  "/child-plan": "娘の希望",
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
        `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3] ${
          isActive
            ? "bg-[#edf6ff] text-[#236da8] shadow-sm"
            : "text-[#526078] hover:bg-white hover:text-[#28334a]"
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
    <div className="min-h-svh bg-[#fffdf9] text-[#28334a]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[60] -translate-y-24 rounded-lg bg-[#28334a] px-4 py-2 font-bold text-white focus:translate-y-0"
      >
        本文へ移動
      </a>

      <header className="sticky top-0 z-40 border-b border-[#dce5ef] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-17 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid size-11 place-items-center rounded-xl text-[#526078] hover:bg-[#edf6ff] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3] xl:hidden"
            >
              {menuOpen ? (
                <X aria-hidden="true" />
              ) : (
                <Menu aria-hidden="true" />
              )}
            </button>
            <NavLink
              to="/"
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3]"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ef767a] via-[#f3c85b] to-[#68a7e3] text-white shadow-sm">
                <Sparkles aria-hidden="true" size={21} />
              </span>
              <span className="hidden text-lg font-black tracking-tight sm:inline">
                くらしリレー
              </span>
            </NavLink>
          </div>
          <p className="truncate text-sm font-bold text-[#526078] sm:text-base">
            {pageTitle}
          </p>
          <NavLink
            to="/settings"
            aria-label="設定を開く"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-[#526078] hover:bg-[#edf6ff] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3] xl:hidden"
          >
            <Settings aria-hidden="true" size={21} />
          </NavLink>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#28334a]/25 xl:hidden"
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
        className={`fixed bottom-0 left-0 top-17 z-40 w-68 border-r border-[#dce5ef] bg-[#fffdf9] p-4 shadow-xl transition-transform xl:hidden ${
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
        <aside className="sticky top-17 hidden h-[calc(100vh-4.25rem)] w-64 shrink-0 border-r border-[#dce5ef] bg-[#fffdf9] p-5 xl:block">
          <nav aria-label="メインメニュー" className="space-y-1">
            {navigation.map((item) => (
              <NavigationItem key={item.to} {...item} />
            ))}
          </nav>
          <div className="absolute bottom-6 left-5 right-5 rounded-2xl border border-[#cfc1f5] bg-gradient-to-br from-[#dff4ff] to-[#eee8ff] p-4 text-sm text-[#52417f]">
            <p className="font-black">今日も、ひとつずつ</p>
            <p className="mt-1 leading-relaxed">
              待機や回復も、大切なくらしの時間です。
            </p>
          </div>
        </aside>

        <main
          id="main-content"
          className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 md:pt-7 xl:pb-10 xl:px-8"
        >
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="モバイルメニュー"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[#dce5ef] bg-white/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(40,51,74,0.08)] xl:hidden"
      >
        {mobileNavigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[0.66rem] font-bold transition focus-visible:outline-3 focus-visible:outline-[#68a7e3] sm:text-xs ${
                isActive ? "bg-[#edf6ff] text-[#236da8]" : "text-[#667085]"
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
