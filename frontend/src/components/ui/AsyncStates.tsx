import { LoaderCircle, RefreshCcw, WifiOff } from "lucide-react";

export function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <div className="flex items-center gap-3 rounded-3xl border border-[#bcdcf7] bg-white p-5 text-[#28334a] shadow-sm">
        <LoaderCircle
          className="animate-spin text-[#3a84c3]"
          aria-hidden="true"
        />
        <div>
          <p className="font-bold">今日のくらしを読み込んでいます</p>
          <p className="mt-1 text-sm text-[#667085]">
            予定と実績をまとめています。
          </p>
        </div>
      </div>
      <div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-[1.4rem] border border-slate-200 bg-white/80"
          />
        ))}
      </div>
    </div>
  );
}

interface DashboardErrorProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function DashboardError({
  message,
  onRetry,
  isRetrying = false,
}: DashboardErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-[1.4rem] border border-[#f2b6b8] bg-white p-6 text-center shadow-sm"
    >
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#fff0f1] text-[#b84047]">
        <WifiOff aria-hidden="true" size={28} />
      </span>
      <h2 className="mt-4 text-xl font-bold text-[#28334a]">
        データを読み込めませんでした
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-[#667085]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#a4373d] px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-[#833037] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#68a7e3] disabled:cursor-wait disabled:opacity-60"
      >
        <RefreshCcw
          className={isRetrying ? "animate-spin" : ""}
          aria-hidden="true"
          size={19}
        />
        {isRetrying ? "再取得中…" : "もう一度試す"}
      </button>
    </div>
  );
}
