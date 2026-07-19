import { Gamepad2, Target } from "lucide-react";
import { DashboardError, DashboardLoading } from "../components/ui/AsyncStates";
import { DashboardCard } from "../components/ui/DashboardCard";
import { LastWarCard } from "../features/dashboard/components/DashboardCards";
import { useDashboardQuery } from "../features/dashboard/queries/useDashboardQuery";
import { getTokyoToday } from "../utils/date";

export function LastWarPage() {
  const query = useDashboardQuery(getTokyoToday());

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--mother-blue-strong)]">
          <Gamepad2 aria-hidden="true" size={17} />
          本人の生活の一部として、生活支援の評価とは分けて扱います
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
          ラストウォー
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
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <LastWarCard progress={query.data.lastWar} />
          <div className="space-y-4">
            <DashboardCard title="今日の状態" icon={Gamepad2} tone="blue">
              <p className="text-sm leading-relaxed text-[var(--text)]">
                回復評価は {query.data.lastWar.recoveryEffect} / 5
                です。数値は状態の目安であり、支援や就労の評価には使いません。
              </p>
            </DashboardCard>
            <DashboardCard title="次に行うこと" icon={Target} tone="yellow">
              <p className="text-sm font-bold leading-relaxed text-[var(--text)]">
                {query.data.lastWar.plannedTasks[0] ||
                  "次の目標はまだ決めていません。"}
              </p>
              <p className="mt-2 text-xs text-[var(--muted-text)]">
                履歴や記録の保存は今後の実装で追加します。
              </p>
            </DashboardCard>
          </div>
        </div>
      )}
    </div>
  );
}
