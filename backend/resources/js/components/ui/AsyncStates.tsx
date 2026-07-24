import { LoaderCircle, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "./Button";

export function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <div className="flex items-center gap-3 rounded-3xl border border-[var(--mother-blue)] bg-white p-5 text-[var(--text)] shadow-sm">
        <LoaderCircle
          className="animate-spin text-[var(--mother-blue-strong)]"
          aria-hidden="true"
        />
        <div>
          <p className="font-bold">今日のくらしを読み込んでいます</p>
          <p className="mt-1 text-sm text-[var(--muted-text)]">
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
      className="rounded-[1.4rem] border border-[var(--mother-red)] bg-white p-6 text-center shadow-sm"
    >
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--mother-red-soft)] text-[var(--mother-red-strong)]">
        <WifiOff aria-hidden="true" size={28} />
      </span>
      <h2 className="mt-4 text-xl font-bold text-[var(--text)]">
        データを読み込めませんでした
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-[var(--muted-text)]">
        {message}
      </p>
      <Button
        onClick={onRetry}
        loading={isRetrying}
        purpose="primary"
        tone="danger"
        icon={RefreshCcw}
        className="mt-5 disabled:cursor-wait"
      >
        {isRetrying ? "再取得中…" : "もう一度試す"}
      </Button>
    </div>
  );
}
