import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, Plus } from "lucide-react";
import { useState } from "react";
import {
  createSupportHandover,
  listSupportHandovers,
  updateSupportHandover,
  type SupportHandoverInput,
} from "../api/supportHandovers";
import { Button } from "../components/ui/Button";
import { DashboardError, DashboardLoading } from "../components/ui/AsyncStates";
import { getTokyoToday } from "../utils/date";

const sourceLabels: Record<string, string> = {
  child_statement: "娘本人の発言",
  mother_confirmed: "母の確認",
  mother_observation: "母の観察",
  mother_assumption: "母の推測",
};

const statusLabels: Record<string, string> = {
  open: "未着手",
  in_progress: "対応中",
  done: "完了",
  returned: "母へ差し戻し",
};

const emptyForm: SupportHandoverInput = {
  title: "",
  assignee_label: "",
  conditions_text: "",
  completion_criteria: "",
  source_kind: "mother_observation",
  local_date: getTokyoToday(),
};

export function SupportPage() {
  const today = getTokyoToday();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SupportHandoverInput>({
    ...emptyForm,
    local_date: today,
  });
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["support-handovers", today],
    queryFn: () => listSupportHandovers(today),
  });

  const createMutation = useMutation({
    mutationFn: createSupportHandover,
    onSuccess: async () => {
      setForm({ ...emptyForm, local_date: today });
      setMessage("支援引き継ぎを追加しました。");
      await queryClient.invalidateQueries({ queryKey: ["support-handovers"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      result_text,
    }: {
      id: number;
      status: string;
      result_text?: string;
    }) => updateSupportHandover(id, { status, result_text }),
    onSuccess: async () => {
      setMessage("状態を更新しました。");
      await queryClient.invalidateQueries({ queryKey: ["support-handovers"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--muted-text)]">
          <Handshake aria-hidden="true" size={16} />
          支援の引き継ぎ
        </p>
        <h1 className="mt-1 text-2xl font-black">担当・条件・完了条件</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-text)]">
          娘本人の発言・母の確認・観察・推測を分けて残し、結果と母への差し戻しも追跡できます。
        </p>
      </header>

      <section className="rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="font-black">新しい引き継ぎ</h2>
        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate(form);
          }}
        >
          <label className="grid gap-1 text-sm">
            <span className="font-bold">タイトル</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              className="min-h-11 rounded-xl border border-[var(--line)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-bold">担当</span>
            <input
              required
              value={form.assignee_label}
              onChange={(e) =>
                setForm((c) => ({ ...c, assignee_label: e.target.value }))
              }
              className="min-h-11 rounded-xl border border-[var(--line)] px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-bold">条件</span>
            <textarea
              required
              value={form.conditions_text}
              onChange={(e) =>
                setForm((c) => ({ ...c, conditions_text: e.target.value }))
              }
              className="min-h-20 rounded-xl border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-bold">完了条件</span>
            <textarea
              required
              value={form.completion_criteria}
              onChange={(e) =>
                setForm((c) => ({ ...c, completion_criteria: e.target.value }))
              }
              className="min-h-20 rounded-xl border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-bold">情報源</span>
            <select
              value={form.source_kind}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  source_kind: e.target.value as SupportHandoverInput["source_kind"],
                }))
              }
              className="min-h-11 rounded-xl border border-[var(--line)] px-3"
            >
              {Object.entries(sourceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" icon={Plus} disabled={createMutation.isPending}>
            {createMutation.isPending ? "保存中…" : "追加する"}
          </Button>
        </form>
      </section>

      {message && (
        <p className="mt-3 text-sm font-bold text-[var(--green)]" role="status">
          {message}
        </p>
      )}

      <section className="mt-6">
        <h2 className="font-black">きょうの引き継ぎ</h2>
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
            まだ引き継ぎはありません。
          </p>
        )}
        {query.isSuccess && (
          <ul className="mt-3 grid gap-3">
            {query.data.map((item) => (
              <li
                key={item.id}
                className="rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black">{item.title}</h3>
                    <p className="mt-1 text-sm text-[var(--muted-text)]">
                      担当: {item.assignee_label} /{" "}
                      {sourceLabels[item.source_kind] ?? item.source_kind}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary-deep)]">
                    {statusLabels[item.status] ?? item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  <strong>条件:</strong> {item.conditions_text}
                </p>
                <p className="mt-1 text-sm">
                  <strong>完了条件:</strong> {item.completion_criteria}
                </p>
                {item.result_text && (
                  <p className="mt-1 text-sm">
                    <strong>結果:</strong> {item.result_text}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="compact"
                    purpose="low"
                    tone="default"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: item.id,
                        status: "in_progress",
                      })
                    }
                  >
                    対応中にする
                  </Button>
                  <Button
                    size="compact"
                    purpose="low"
                    tone="default"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: item.id,
                        status: "done",
                        result_text: item.result_text ?? "完了を確認しました",
                      })
                    }
                  >
                    完了にする
                  </Button>
                  <Button
                    size="compact"
                    purpose="low"
                    tone="default"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: item.id,
                        status: "returned",
                        result_text: "母へ差し戻しました",
                      })
                    }
                  >
                    母へ差し戻す
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
