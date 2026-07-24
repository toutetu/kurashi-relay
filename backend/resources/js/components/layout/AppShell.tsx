import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardPenLine,
  Cookie,
  FileText,
  Heart,
  Gamepad2,
  ListChecks,
  Home,
  Menu,
  MessageCircleHeart,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navigationGroups: NavGroup[] = [
  {
    items: [{ to: "/", label: "ホーム", icon: Home }],
  },
  {
    label: "娘のおしごと",
    items: [
      { to: "/oshigoto", label: "おしごと", icon: Moon },
      { to: "/musume", label: "なにする？", icon: Heart },
      { to: "/records/musume", label: "きろくを見る", icon: ClipboardPenLine },
    ],
  },
  {
    label: "ママのおしごと",
    items: [
      { to: "/koekake", label: "声かけ", icon: MessageCircleHeart },
      { to: "/last-war", label: "ラストウォー", icon: Gamepad2 },
      { to: "/mama-kaji", label: "家事手帖", icon: Cookie },
      { to: "/records", label: "記録", icon: ClipboardPenLine },
      { to: "/schedule", label: "今日の予定", icon: CalendarDays },
      { to: "/schedule-comparison", label: "予定と実績", icon: BarChart3 },
      { to: "/child-plan", label: "娘の状態", icon: Heart },
      { to: "/mama-state", label: "私の状態", icon: UserRound },
    ],
  },
  {
    label: "管理・報告系",
    items: [
      { to: "/summary", label: "今日のまとめ", icon: ListChecks },
      { to: "/support", label: "支援", icon: Users },
      { to: "/reports", label: "レポート", icon: FileText },
    ],
  },
  {
    items: [{ to: "/settings", label: "設定", icon: Settings }],
  },
];

const allNavigationItems = navigationGroups.flatMap((group) => group.items);

const mobileNavigationPaths = [
  "/",
  "/schedule",
  "/records/musume",
  "/mama-kaji",
  "/child-plan",
] as const;

const mobileNavigation = mobileNavigationPaths.map((path) => {
  const item = allNavigationItems.find((nav) => nav.to === path);
  if (!item) {
    throw new Error(`Mobile navigation item not found: ${path}`);
  }
  return item;
});

const SIDEBAR_STORAGE_KEY = "kurashi-relay:sidebar-open";
const NAV_GROUPS_STORAGE_KEY = "kurashi-relay:nav-groups-open";

const pageTitles: Record<string, string> = {
  "/": "ホーム",
  "/schedule-comparison": "今日の予定と実績",
  "/schedule": "今日の予定",
  "/records": "記録",
  "/records/musume": "きろくを見る",
  "/mama-kaji": "ママの家事手帖",
  "/mama-kaji/zukan": "世界のおやつ図鑑",
  "/child-plan": "娘の状態・今日の作戦",
  "/mama-state": "私の状態",
  "/musume": "なにする？",
  "/koekake": "声かけリマインダー",
  "/oshigoto": "くらしのおしごと",
  "/oshigoto/zukan": "ゾンビ図鑑",
  "/oshigoto/usj": "USJ 達成チェック",
  "/summary": "今日のまとめ",
  "/last-war": "ラストウォー",
  "/support": "支援",
  "/reports": "レポート",
  "/settings": "設定",
};

const defaultOpenGroups = Object.fromEntries(
  navigationGroups
    .filter((group) => group.label)
    .map((group) => [group.label!, true]),
) as Record<string, boolean>;

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function readOpenGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(NAV_GROUPS_STORAGE_KEY);
    if (!raw) return defaultOpenGroups;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next = { ...defaultOpenGroups };
    for (const label of Object.keys(defaultOpenGroups)) {
      if (typeof parsed[label] === "boolean") {
        next[label] = parsed[label];
      }
    }
    return next;
  } catch {
    return defaultOpenGroups;
  }
}

function NavigationItem({
  to,
  label,
  icon: Icon,
  onClick,
  collapsed = false,
}: NavItem & {
  onClick?: () => void;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/" || to === "/records"}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex min-h-10 items-center gap-2.5 text-sm transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
          collapsed ? "size-10 justify-center px-0" : "px-2 py-1.5"
        } ${
          isActive
            ? "font-bold text-[var(--primary-deep)]"
            : "font-medium text-[var(--muted-text)] hover:text-[var(--text)]"
        }`
      }
    >
      <Icon aria-hidden="true" size={18} className="shrink-0" />
      <span className={collapsed ? "sr-only" : "min-w-0 leading-tight"}>
        {label}
      </span>
    </NavLink>
  );
}

function CollapsibleNavGroup({
  label,
  items,
  open,
  onToggle,
  sidebarCollapsed = false,
  onItemClick,
}: {
  label: string;
  items: NavItem[];
  open: boolean;
  onToggle: () => void;
  sidebarCollapsed?: boolean;
  onItemClick?: () => void;
}) {
  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col items-center">
        <div
          className="my-2 h-px w-8 bg-[var(--line)]"
          role="separator"
          aria-hidden="true"
        />
        <div className="flex flex-col items-center space-y-0.5">
          {items.map((item) => (
            <NavigationItem
              key={`${label}-${item.to}`}
              {...item}
              collapsed
              onClick={onItemClick}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="mt-3 flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[0.7rem] font-bold tracking-wide text-[var(--muted-text)] transition hover:text-[var(--text)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <span>{label}</span>
        <ChevronDown
          aria-hidden="true"
          size={14}
          className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open ? (
        <div className="flex flex-col space-y-0.5 border-l border-[var(--line)] ml-2 pl-1">
          {items.map((item) => (
            <NavigationItem
              key={`${label}-${item.to}`}
              {...item}
              onClick={onItemClick}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [openGroups, setOpenGroups] = useState(readOpenGroups);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const wasMenuOpen = useRef(false);
  const pageTitle = pageTitles[pathname] ?? "くらしリレー";

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_GROUPS_STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      /* ignore */
    }
  }, [openGroups]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavGroups = (
    options: {
      sidebarCollapsed?: boolean;
      onItemClick?: () => void;
    } = {},
  ) =>
    navigationGroups.map((group, groupIndex) => {
      if (!group.label) {
        return (
          <div
            key={`ungrouped-${groupIndex}`}
            className={
              options.sidebarCollapsed ? "flex flex-col items-center" : undefined
            }
          >
            <div
              className={
                options.sidebarCollapsed
                  ? "flex flex-col items-center space-y-0.5"
                  : "flex flex-col space-y-0.5"
              }
            >
              {group.items.map((item) => (
                <NavigationItem
                  key={`ungrouped-${item.to}`}
                  {...item}
                  collapsed={options.sidebarCollapsed}
                  onClick={options.onItemClick}
                />
              ))}
            </div>
          </div>
        );
      }

      return (
        <CollapsibleNavGroup
          key={group.label}
          label={group.label}
          items={group.items}
          open={openGroups[group.label] ?? true}
          onToggle={() => toggleGroup(group.label!)}
          sidebarCollapsed={options.sidebarCollapsed}
          onItemClick={options.onItemClick}
        />
      );
    });

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const pressable = target.closest(".pressable, .button");
      if (!(pressable instanceof HTMLElement)) return;
      pressable.classList.remove("popping");
      void pressable.offsetWidth;
      pressable.classList.add("popping");
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

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
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMenuOpen((open) => !open)}
              className="pressable grid size-11 place-items-center rounded-xl text-[var(--muted-text)] hover:bg-[var(--primary-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] xl:hidden"
            >
              {menuOpen ? (
                <X aria-hidden="true" />
              ) : (
                <Menu aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              aria-label={
                sidebarOpen ? "サイドバーをたたむ" : "サイドバーをひろげる"
              }
              onClick={() => setSidebarOpen((open) => !open)}
              className="pressable hidden size-11 place-items-center rounded-xl text-[var(--muted-text)] hover:bg-[var(--primary-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] xl:grid"
            >
              {sidebarOpen ? (
                <PanelLeftClose aria-hidden="true" size={20} />
              ) : (
                <PanelLeftOpen aria-hidden="true" size={20} />
              )}
            </button>
            <NavLink
              to="/"
              className="pressable flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <span className="grid size-10 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm">
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
            className="pressable grid size-11 shrink-0 place-items-center rounded-xl text-[var(--muted-text)] hover:bg-[var(--primary-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] xl:hidden"
          >
            <Settings aria-hidden="true" size={21} />
          </NavLink>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-14 z-40 bg-[var(--text)]/25 xl:hidden"
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
        className={`fixed bottom-0 left-0 top-14 z-50 w-68 overflow-y-auto overscroll-contain border-r border-[var(--border)] bg-[var(--page-background)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl transition-transform xl:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="space-y-0.5">
          {renderNavGroups({ onItemClick: () => setMenuOpen(false) })}
        </nav>
      </aside>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-[var(--border)] bg-[var(--page-background)] transition-[width] xl:flex xl:flex-col ${
            sidebarOpen ? "w-64 p-3" : "w-20 items-center p-3"
          }`}
        >
          <nav
            aria-label="メインメニュー"
            className={`min-h-0 flex-1 overflow-y-auto ${
              sidebarOpen ? "space-y-0.5" : "flex flex-col items-center space-y-0.5"
            }`}
          >
            {renderNavGroups({ sidebarCollapsed: !sidebarOpen })}
          </nav>
          {sidebarOpen && (
            <div className="mt-auto rounded-2xl border border-dashed border-[var(--line)] bg-[var(--primary-soft)] p-4 text-sm text-[var(--primary-deep)]">
              <p className="font-black">今日も、ひとつずつ</p>
              <p className="mt-1 leading-relaxed">
                待機や回復も、大切なくらしの時間です。
              </p>
            </div>
          )}
        </aside>

        <main
          id="main-content"
          className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 md:pt-7 xl:pb-3 xl:px-8 xl:pt-2"
        >
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="モバイルメニュー"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end border-t border-[var(--border)] bg-white/97 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-8px_28px_rgba(40,51,74,0.08)] xl:hidden"
      >
        {mobileNavigation.map(({ to, label, icon: Icon }) => {
          const isFab = to === "/records/musume";
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                isFab
                  ? `pressable -mt-6 flex size-14 flex-col items-center justify-center justify-self-center gap-0.5 rounded-full border-4 border-[var(--page-background)] bg-[var(--primary)] text-white shadow-lg focus-visible:outline-3 focus-visible:outline-[var(--focus)] ${
                      isActive ? "ring-2 ring-[var(--primary-deep)]" : ""
                    }`
                  : `pressable flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[0.66rem] font-bold transition focus-visible:outline-3 focus-visible:outline-[var(--focus)] sm:text-xs ${
                      isActive
                        ? "bg-[var(--primary-soft)] text-[var(--primary-deep)]"
                        : "text-[var(--muted-text)]"
                    }`
              }
            >
              <Icon aria-hidden="true" size={isFab ? 20 : 20} />
              <span className={`max-w-full truncate ${isFab ? "text-[9px] font-extrabold" : ""}`}>
                {isFab ? "きろく" : label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
