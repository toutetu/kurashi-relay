import { Link, usePage } from "@inertiajs/react";
import {
  BarChart3,
  CalendarDays,
  ClipboardPenLine,
  Cookie,
  FileText,
  Gamepad2,
  Heart,
  Home,
  ListChecks,
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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAppPath } from "@/navigation/AppPathContext";
import { resolveInertiaUrlPrefix } from "@/navigation/inertiaPath";
import type { SharedPageProps } from "@/inertia/types";

type NavItem = {
  spaPath: string;
  label: string;
  icon: typeof Home;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navigationGroups: NavGroup[] = [
  {
    items: [{ spaPath: "/", label: "ホーム", icon: Home }],
  },
  {
    label: "おしごと系",
    items: [
      { spaPath: "/oshigoto", label: "おしごと", icon: Moon },
      { spaPath: "/musume", label: "なにする？", icon: Heart },
      { spaPath: "/records/musume", label: "きろく", icon: ClipboardPenLine },
    ],
  },
  {
    label: "ママのおしごと",
    items: [
      { spaPath: "/koekake", label: "声かけ", icon: MessageCircleHeart },
      { spaPath: "/last-war", label: "ラストウォー", icon: Gamepad2 },
      { spaPath: "/mama-kaji", label: "家事手帖", icon: Cookie },
      { spaPath: "/records", label: "記録", icon: ClipboardPenLine },
      { spaPath: "/schedule", label: "今日の予定", icon: CalendarDays },
      { spaPath: "/schedule-comparison", label: "予定と実績", icon: BarChart3 },
      { spaPath: "/child-plan", label: "娘の状態", icon: Heart },
      { spaPath: "/mama-state", label: "私の状態", icon: UserRound },
    ],
  },
  {
    label: "管理・報告系",
    items: [
      { spaPath: "/summary", label: "今日のまとめ", icon: ListChecks },
      { spaPath: "/support", label: "支援", icon: Users },
      { spaPath: "/reports", label: "レポート", icon: FileText },
    ],
  },
  {
    items: [{ spaPath: "/settings", label: "設定", icon: Settings }],
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
  const item = allNavigationItems.find((nav) => nav.spaPath === path);
  if (!item) {
    throw new Error(`Mobile navigation item not found: ${path}`);
  }
  return item;
});

const pageTitles: Record<string, string> = {
  "/": "ホーム",
  "/schedule-comparison": "今日の予定と実績",
  "/schedule": "今日の予定",
  "/records": "記録",
  "/records/musume": "きろく",
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

const SIDEBAR_STORAGE_KEY = "kurashi-relay:sidebar-open";

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function resolvePageTitle(pathname: string, pathPrefix: string): string {
  const spaPath = pathPrefix !== "" && pathname.startsWith(pathPrefix)
    ? pathname.slice(pathPrefix.length) || "/"
    : pathname;

  return pageTitles[spaPath] ?? "くらしリレー";
}

function isPathActive(currentPath: string, targetPath: string, pathPrefix: string): boolean {
  if (
    targetPath === "/" ||
    targetPath === pathPrefix ||
    targetPath === `${pathPrefix}/`
  ) {
    return currentPath === targetPath || currentPath === `${targetPath}/`;
  }

  // /records は /records/musume でアクティブにしない
  if (
    targetPath === "/records" ||
    targetPath === `${pathPrefix}/records`
  ) {
    return currentPath === targetPath || currentPath === `${targetPath}/`;
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

type NavigationItemProps = NavItem & {
  href: string;
  isActive: boolean;
  onClick?: () => void;
  collapsed?: boolean;
};

function NavigationGroupLabel({
  label,
  collapsed = false,
}: {
  label: string;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <div
        className="my-2 h-px w-8 bg-[var(--line)]"
        role="separator"
        aria-hidden="true"
      />
    );
  }

  return (
    <p className="px-3 pb-1 pt-4 text-[0.7rem] font-bold tracking-wide text-[var(--muted-text)]">
      {label}
    </p>
  );
}

function NavigationItem({
  label,
  icon: Icon,
  href,
  isActive,
  onClick,
  collapsed = false,
}: NavigationItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`pressable flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
        collapsed ? "size-11 justify-center px-0" : "px-2.5 py-2"
      } ${
        isActive
          ? "bg-[var(--primary-soft)] text-[var(--primary-deep)] shadow-sm"
          : "text-[var(--muted-text)] hover:bg-white hover:text-[var(--text)]"
      }`}
    >
      <Icon aria-hidden="true" size={20} className="shrink-0" />
      <span className={collapsed ? "sr-only" : "min-w-0 leading-tight"}>
        {label}
      </span>
    </Link>
  );
}

type InertiaAppShellProps = {
  children: ReactNode;
};

export function InertiaAppShell({ children }: InertiaAppShellProps) {
  const { url, props } = usePage<SharedPageProps>();
  const pathPrefix = resolveInertiaUrlPrefix(props.app.inertiaPrefix);
  const pathname = new URL(url, "http://localhost").pathname;
  const resolvePath = useAppPath;
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const wasMenuOpen = useRef(false);
  const pageTitle = resolvePageTitle(pathname, pathPrefix);
  const homePath = resolvePath("/");
  const settingsPath = resolvePath("/settings");

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

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
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
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
            <Link
              href={homePath}
              className="pressable flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <span className="grid size-10 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm">
                <Sparkles aria-hidden="true" size={21} />
              </span>
              <span className="hidden text-lg font-black tracking-tight sm:inline">
                くらしリレー
              </span>
            </Link>
          </div>
          <p className="truncate text-sm font-bold text-[var(--muted-text)] sm:text-base">
            {pageTitle}
          </p>
          <Link
            href={settingsPath}
            aria-label="設定を開く"
            className="pressable grid size-11 shrink-0 place-items-center rounded-xl text-[var(--muted-text)] hover:bg-[var(--primary-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] xl:hidden"
          >
            <Settings aria-hidden="true" size={21} />
          </Link>
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
        className={`fixed bottom-0 left-0 top-14 z-40 w-68 border-r border-[var(--border)] bg-[var(--page-background)] p-4 shadow-xl transition-transform xl:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="space-y-1">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.label ?? `ungrouped-${groupIndex}`}>
              {group.label ? <NavigationGroupLabel label={group.label} /> : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const href = resolvePath(item.spaPath);
                  return (
                    <NavigationItem
                      key={`${group.label ?? "ungrouped"}-${item.spaPath}`}
                      {...item}
                      href={href}
                      isActive={isPathActive(pathname, href, pathPrefix)}
                      onClick={() => setMenuOpen(false)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-[var(--border)] bg-[var(--page-background)] transition-[width] xl:flex xl:flex-col ${
            sidebarOpen ? "w-[28rem] p-4" : "w-20 items-center p-3"
          }`}
        >
          <nav
            aria-label="メインメニュー"
            className={`min-h-0 flex-1 overflow-y-auto ${
              sidebarOpen ? "space-y-1" : "flex flex-col items-center space-y-1"
            }`}
          >
            {navigationGroups.map((group, groupIndex) => (
              <div
                key={group.label ?? `ungrouped-${groupIndex}`}
                className={sidebarOpen ? undefined : "flex flex-col items-center"}
              >
                {group.label ? (
                  <NavigationGroupLabel
                    label={group.label}
                    collapsed={!sidebarOpen}
                  />
                ) : null}
                <div
                  className={
                    sidebarOpen
                      ? "grid grid-cols-2 gap-1"
                      : "flex flex-col items-center space-y-1"
                  }
                >
                  {group.items.map((item) => {
                    const href = resolvePath(item.spaPath);
                    return (
                      <NavigationItem
                        key={`${group.label ?? "ungrouped"}-${item.spaPath}`}
                        {...item}
                        href={href}
                        isActive={isPathActive(pathname, href, pathPrefix)}
                        collapsed={!sidebarOpen}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
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
          {children}
        </main>
      </div>

      <nav
        aria-label="モバイルメニュー"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end border-t border-[var(--border)] bg-white/97 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-8px_28px_rgba(40,51,74,0.08)] xl:hidden"
      >
        {mobileNavigation.map(({ spaPath, label, icon: Icon }) => {
          const href = resolvePath(spaPath);
          const isFab = spaPath === "/records/musume";
          const isActive = isPathActive(pathname, href, pathPrefix);

          return (
            <Link
              key={spaPath}
              href={href}
              className={
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
              <Icon aria-hidden="true" size={20} />
              <span
                className={`max-w-full truncate ${isFab ? "text-[9px] font-extrabold" : ""}`}
              >
                {isFab ? "きろく" : label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
