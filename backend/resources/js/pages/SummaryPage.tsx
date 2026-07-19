import { ClipboardList, Sparkles } from "lucide-react";
import { DashboardError, DashboardLoading } from "../components/ui/AsyncStates";
import {
  ActionItemsCard,
  ImpactSummaryCard,
} from "../features/dashboard/components/DashboardCards";
import { useDashboardQuery } from "../features/dashboard/queries/useDashboardQuery";
import { getTokyoToday } from "../utils/date";

export function SummaryPage() {
  const query = useDashboardQuery(getTokyoToday());

  return (
    <div className="mx-auto max-w-[1420px]">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--mother-blue-strong)]">
          <Sparkles aria-hidden="true" size={17} />
          今日の詳細を、必要なときに確認します
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          <ClipboardList aria-hidden="true" size={28} />
          今日のまとめ
        </h1>
      </div>

      {query.isPending && <DashboardLoading />}
      {query.isError && (
        <DashboardError
          message={
            query.error instanceof Error
              ? query.error.message
              : "通信状態を確認して、もう一度お試しください。"
          }
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      )}
      {query.isSuccess && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <ImpactSummaryCard impact={query.data.scheduleImpactSummary} />
          <ActionItemsCard items={query.data.actionItems} />
        </div>
      )}
    </div>
  );
}
