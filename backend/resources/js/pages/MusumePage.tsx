import { useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { DashboardError } from "../components/ui/AsyncStates";
import {
  formatTokyoDate,
  getTokyoToday,
  parseMusumePreviewAt,
} from "../utils/date";
import { MusumeHome } from "../features/musume/components/MusumeHome";
import { useMusumePlanQuery } from "../features/musume/queries";
import "../features/musume/musume.css";

export function MusumePage() {
  const [searchParams] = useSearchParams();
  const previewNow = parseMusumePreviewAt(searchParams.get("at"));
  const today = previewNow ? formatTokyoDate(previewNow) : getTokyoToday();
  const planQuery = useMusumePlanQuery(today);

  return (
    <div className="musume-page -mx-4 px-4 sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8">
      {previewNow && (
        <p className="msm-preview-note" role="status">
          確認用時刻: {searchParams.get("at")}（Asia/Tokyo）
        </p>
      )}

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

      {planQuery.data && (
        <MusumeHome
          plan={planQuery.data.plan}
          date={today}
          previewNow={previewNow}
        />
      )}
    </div>
  );
}
