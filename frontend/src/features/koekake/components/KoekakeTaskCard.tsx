import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import type {
  CompletionStatus,
  KoekakeTaskSummary,
} from "../../../api/schemas/koekakeSchema";
import { formatTime } from "../../../utils/date";
import {
  buildDefaultPromptPayload,
  COMPLETION_STATUS_LABELS,
  isKoekakeTaskDue,
  QUICK_COMPLETION_OPTIONS,
} from "../utils";

type KoekakeTaskCardProps = {
  task: KoekakeTaskSummary;
  onPrompt: (task: KoekakeTaskSummary) => void;
  onSnooze: (task: KoekakeTaskSummary) => void;
  onCompletion: (task: KoekakeTaskSummary, status: CompletionStatus) => void;
  onOpenDetail: (task: KoekakeTaskSummary) => void;
  isPromptPending?: boolean;
  isSnoozePending?: boolean;
  isCompletionPending?: boolean;
  isPromptBlocked?: boolean;
};

const SELF_ONLY_ACTIVITY_KEYS = new Set(["ACT-037"]);

export function KoekakeTaskCard({
  task,
  onPrompt,
  onSnooze,
  onCompletion,
  onOpenDetail,
  isPromptPending = false,
  isSnoozePending = false,
  isCompletionPending = false,
  isPromptBlocked = false,
}: KoekakeTaskCardProps) {
  const [flyKey, setFlyKey] = useState(0);
  const due = isKoekakeTaskDue(task);
  const promptPreview = buildDefaultPromptPayload(task);
  const parentDoneDisabled =
    task.activity_key !== null && SELF_ONLY_ACTIVITY_KEYS.has(task.activity_key);

  const handlePrompt = () => {
    setFlyKey((key) => key + 1);
    onPrompt(task);
  };

  return (
    <article
      className={`relative rounded-[1.25rem] border bg-white p-4 shadow-sm ${
        due
          ? "border-[var(--mother-blue)] bg-[var(--mother-blue-soft)]/30"
          : "border-[var(--border)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--mother-blue-soft)] text-xl"
          aria-hidden="true"
        >
          {task.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black text-[var(--text)]">{task.name}</h2>
            {task.completion && (
              <span className="rounded-full bg-[var(--mother-blue-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--mother-blue-strong)]">
                {COMPLETION_STATUS_LABELS[task.completion.status]}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-bold tabular-nums text-[var(--text)]">
            声かけ {task.prompt_count}回
          </p>
          <dl className="mt-2 space-y-1 text-xs text-[var(--muted-text)]">
            {task.latest_prompt_at && (
              <div className="flex gap-2">
                <dt className="shrink-0">最新</dt>
                <dd>{formatTime(task.latest_prompt_at)}</dd>
              </div>
            )}
            {task.next_remind_at && (
              <div className="flex gap-2">
                <dt className="shrink-0">次回通知</dt>
                <dd>{formatTime(task.next_remind_at)}</dd>
              </div>
            )}
          </dl>
          {promptPreview.prompt_text && (
            <p className="mt-3 rounded-xl bg-[var(--mother-blue-soft)]/50 px-3 py-2 text-sm leading-relaxed text-[var(--text)]">
              {task.suggested_prompt?.text ?? promptPreview.prompt_text}
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
        <Button
          type="button"
          variant="outline"
          tone="blue"
          size="compact"
          className="relative shrink-0 [--fly-color:var(--mother-blue-strong)]"
          aria-label={`${task.name}に声かけ`}
          loading={isPromptBlocked}
          disabled={isPromptBlocked}
          aria-busy={isPromptPending || isPromptBlocked || undefined}
          onClick={handlePrompt}
        >
          {isPromptBlocked && !isPromptPending ? "更新中…" : "声かけ"}
          {flyKey > 0 && (
            <span
              key={flyKey}
              className="fly pointer-events-none absolute right-1 top-0 [--fly-color:var(--mother-blue-strong)]"
              aria-hidden="true"
            >
              +1
            </span>
          )}
        </Button>
        {QUICK_COMPLETION_OPTIONS.map((status) => {
          const selected = task.completion?.status === status;
          const disabled =
            isCompletionPending ||
            (status === "parent_done" && parentDoneDisabled);

          return (
            <Button
              key={status}
              type="button"
              className="shrink-0"
              size="compact"
              variant={selected ? "solid" : "outline"}
              tone="blue"
              loading={isCompletionPending && selected}
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${task.name}を${COMPLETION_STATUS_LABELS[status]}にする`}
              onClick={() => onCompletion(task, status)}
            >
              {COMPLETION_STATUS_LABELS[status]}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="outline"
          tone="blue"
          size="compact"
          className="shrink-0"
          aria-label={`${task.name}を5分後に再通知`}
          loading={isSnoozePending}
          onClick={() => onSnooze(task)}
        >
          5分後
        </Button>
        <Button
          type="button"
          variant="ghost"
          tone="neutral"
          size="compact"
          className="shrink-0"
          aria-label={`${task.name}の詳細`}
          onClick={() => onOpenDetail(task)}
        >
          詳細
        </Button>
      </div>
    </article>
  );
}
