import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import type {
  KoekakeTaskDetail,
  KoekakeTaskSummary,
  PromptSource,
} from "../../../api/schemas/koekakeSchema";
import { formatDateTime, formatTime } from "../../../utils/date";

type KoekakeDetailSheetProps = {
  taskId: number;
  summary: KoekakeTaskSummary;
  detail: KoekakeTaskDetail | undefined;
  isLoading: boolean;
  onClose: () => void;
  onPromptWithText: (
    task: KoekakeTaskSummary,
    promptText: string,
    source: PromptSource,
  ) => void;
  onSnooze: (taskId: number, minutes: 5 | 10 | 15) => void;
  onSnoozeNoneToday: (taskId: number) => void;
  pendingPrompt?: boolean;
  pendingSnooze?: boolean;
  pendingCancel?: boolean;
};

export function KoekakeDetailSheet({
  taskId,
  summary,
  detail,
  isLoading,
  onClose,
  onPromptWithText,
  onSnooze,
  onSnoozeNoneToday,
  pendingPrompt = false,
  pendingSnooze = false,
  pendingCancel = false,
}: KoekakeDetailSheetProps) {
  const promptPending = pendingPrompt || pendingCancel;
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null,
  );
  const [editedText, setEditedText] = useState("");
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const prompts = detail?.prompts ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--text)]/25 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="詳細を閉じる"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,48rem)] w-full max-w-lg flex-col rounded-t-[1.5rem] border border-[var(--border)] bg-white shadow-xl sm:rounded-[1.5rem]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[var(--mother-blue-strong)]">
              {summary.icon} 詳細
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-black text-[var(--text)]">
              {summary.name}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="pressable grid size-10 place-items-center rounded-xl text-[var(--muted-text)] hover:bg-[var(--mother-blue-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          <section aria-labelledby={`${titleId}-history`}>
            <h3
              id={`${titleId}-history`}
              className="text-sm font-black text-[var(--text)]"
            >
              きょうの声かけ
            </h3>
            {isLoading ? (
              <p className="mt-2 text-sm text-[var(--muted-text)]">読み込み中…</p>
            ) : prompts.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted-text)]">
                まだ声かけの記録はありません。
              </p>
            ) : (
              <ol className="mt-2 list-none space-y-2 p-0">
                {prompts.map((prompt, index) => (
                  <li
                    key={prompt.id}
                    className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <p className="font-bold text-[var(--mother-blue-strong)]">
                      {index + 1}回目 ・ {formatTime(prompt.prompted_at)}
                    </p>
                    <p className="mt-1 leading-relaxed text-[var(--text)]">
                      {prompt.prompt_text}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="mt-6" aria-labelledby={`${titleId}-candidates`}>
            <h3
              id={`${titleId}-candidates`}
              className="text-sm font-black text-[var(--text)]"
            >
              おすすめの言い方
            </h3>
            {isLoading ? (
              <p className="mt-2 text-sm text-[var(--muted-text)]">読み込み中…</p>
            ) : (
              <div className="mt-2 space-y-4">
                {(detail?.prompt_candidates ?? []).map((group) => (
                  <div key={group.level}>
                    <p className="text-xs font-bold text-[var(--muted-text)]">
                      {group.level}回目の候補
                    </p>
                    <ul className="mt-2 list-none space-y-2 p-0">
                      {group.items.map((item) => (
                        <li
                          key={item.prompt_template_id}
                          className="rounded-xl border border-[var(--border)] p-3"
                        >
                          <p className="text-sm leading-relaxed text-[var(--text)]">
                            {item.text}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="compact"
                              tone="blue"
                              loading={promptPending}
                              onClick={() =>
                                onPromptWithText(summary, item.text, "template")
                              }
                            >
                              この文で声かけ済み
                            </Button>
                            <Button
                              type="button"
                              size="compact"
                              variant="outline"
                              tone="blue"
                              onClick={() => {
                                setEditingTemplateId(item.prompt_template_id);
                                setEditedText(item.text);
                              }}
                            >
                              文を編集して声かけ済み
                            </Button>
                          </div>
                          {editingTemplateId === item.prompt_template_id && (
                            <div className="mt-3 space-y-2">
                              <textarea
                                value={editedText}
                                onChange={(event) =>
                                  setEditedText(event.target.value)
                                }
                                rows={3}
                                className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                                aria-label="編集した声かけ文"
                              />
                              <Button
                                type="button"
                                size="compact"
                                tone="blue"
                                loading={promptPending}
                                disabled={editedText.trim() === ""}
                                onClick={() => {
                                  onPromptWithText(
                                    summary,
                                    editedText.trim(),
                                    "edited",
                                  );
                                  setEditingTemplateId(null);
                                }}
                              >
                                編集文で声かけ済み
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6" aria-labelledby={`${titleId}-custom`}>
            <h3
              id={`${titleId}-custom`}
              className="text-sm font-black text-[var(--text)]"
            >
              自由入力
            </h3>
            <textarea
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              rows={3}
              placeholder="声かけた内容を入力"
              className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
              aria-label="自由入力の声かけ文"
            />
            <Button
              type="button"
              className="mt-2"
              size="compact"
              tone="blue"
              loading={promptPending}
              disabled={customText.trim() === "" || pendingCancel}
              onClick={() => {
                onPromptWithText(summary, customText.trim(), "custom");
                setCustomText("");
              }}
            >
              自由入力で声かけ済み
            </Button>
          </section>

          <section className="mt-6" aria-labelledby={`${titleId}-snooze`}>
            <h3
              id={`${titleId}-snooze`}
              className="text-sm font-black text-[var(--text)]"
            >
              再通知
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {([5, 10, 15] as const).map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  size="compact"
                  variant="outline"
                  tone="blue"
                  loading={pendingSnooze}
                  onClick={() => onSnooze(taskId, minutes)}
                >
                  {minutes}分後
                </Button>
              ))}
              <Button
                type="button"
                size="compact"
                variant="ghost"
                tone="neutral"
                loading={pendingSnooze}
                onClick={() => onSnoozeNoneToday(taskId)}
              >
                今日はもう通知しない
              </Button>
            </div>
            {summary.next_remind_at && (
              <p className="mt-2 text-xs text-[var(--muted-text)]">
                次回通知: {formatDateTime(summary.next_remind_at)}
              </p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
