import { ApiError } from "../api/client";
import { DashboardError } from "../components/ui/AsyncStates";
import { getTokyoToday } from "../utils/date";
import { MusumeHome } from "../features/musume/components/MusumeHome";
import { useMusumePlanQuery } from "../features/musume/queries";
import "../features/musume/musume.css";

export function MusumePage() {
  const today = getTokyoToday();
  const planQuery = useMusumePlanQuery(today);

  return (
    <div className="musume-page -mx-4 px-4 sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8">
      {planQuery.isPending && (
        <p className="msm-loading" role="status">
          読み込み中…
        </p>
      )}

      {planQuery.isError && (
        <DashboardError
          message={
            planQuery.error instanceof ApiError
              ? planQuery.error.message
              : "見通しを読み込めませんでした。"
          }
          onRetry={() => void planQuery.refetch()}
          isRetrying={planQuery.isFetching}
        />
      )}

      {planQuery.data && <MusumeHome plan={planQuery.data.plan} date={today} />}
    </div>
  );
}
