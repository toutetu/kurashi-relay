import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Link2, Plus } from "lucide-react";
import { useState } from "react";
import { createReport, listReports, shareReport } from "../api/reports";
import { Button } from "../components/ui/Button";
import { DashboardError, DashboardLoading } from "../components/ui/AsyncStates";
import { getTokyoToday } from "../utils/date";

const audienceLabels: Record<string, string> = {
  school: "学校",
  support_agency: "支援機関",
  family: "家族",
};

export function ReportsPage() {
  const today = getTokyoToday();
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<"school" | "support_agency" | "family">(
    "support_agency",
  );
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["reports"],
    queryFn: listReports,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createReport({
        audience,
        period_start: today,
        period_end: today,
      }),
    onSuccess: async () => {
      setMessage("レポートを作成しました（ラストウォー詳細は除外）。");
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: shareReport,
    onSuccess: async (report) => {
      const url = `${window.location.origin}/api/shared-reports/${report.share_token}`;
      setMessage(`共有URLを作成しました: ${url}`);
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--muted-text)]">
          <FileText aria-hidden="true" size={16} />
          レポート
        </p>
        <h1 className="mt-1 text-2xl font-black">支援者向けの説明</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-text)]">
          必要な範囲だけをまとめます。ラストウォーの詳細は自動では含めません。
        </p>
      </header>

      <section className="rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="font-black">きょうのレポートを作成</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1 text-sm">
            <span className="font-bold">宛先</span>
            <select
              value={audience}
              onChange={(e) =>
                setAudience(
                  e.target.value as "school" | "support_agency" | "family",
                )
              }
              className="min-h-11 rounded-xl border border-[var(--line)] px-3"
            >
              {Object.entries(audienceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button
            icon={Plus}
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "作成中…" : "作成する"}
          </Button>
        </div>
      </section>

      {message && (
        <p className="mt-3 break-all text-sm font-bold text-[var(--green)]" role="status">
          {message}
        </p>
      )}

      <section className="mt-6">
        <h2 className="font-black">作成済み</h2>
        {query.isPending && <DashboardLoading />}
        {query.isError && (
          <DashboardError
            message={
              query.error instanceof Error
                ? query.error.message
                : "読み込みに失敗しました。"
            }
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        )}
        {query.isSuccess && query.data.length === 0 && (
          <p className="mt-3 text-sm text-[var(--muted-text)]">
            まだレポートはありません。
          </p>
        )}
        {query.isSuccess && (
          <ul className="mt-3 grid gap-3">
            {query.data.map((report) => (
              <li
                key={report.id}
                className="rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <h3 className="font-black">{report.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted-text)]">
                  {audienceLabels[report.audience] ?? report.audience} /{" "}
                  {report.period_start}〜{report.period_end}
                  {report.excludes_last_war ? " / ラストウォー除外" : ""}
                </p>
                <div className="mt-3">
                  <Button
                    size="compact"
                    icon={Link2}
                    variant="ghost"
                    tone="neutral"
                    disabled={shareMutation.isPending}
                    onClick={() => shareMutation.mutate(report.id)}
                  >
                    共有URLを発行
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
