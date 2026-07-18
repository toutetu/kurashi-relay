import { useState } from "react";
import type { MusumePlan } from "../api/schemas/musumeSchema";
import {
  SCHOOL_REVIEW_ITEMS,
  SUMMER_REVIEW_ITEMS,
  isSummerMode,
} from "../utils";
import { MusumeBottomSheet } from "./MusumeBottomSheet";

type ReviewSheetProps = {
  plan: MusumePlan;
  open: boolean;
  resetKey: number;
  onClose: () => void;
  onComplete: () => Promise<void>;
  isSaving: boolean;
};

type ReviewSheetEditorProps = {
  plan: MusumePlan;
  onComplete: () => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  isSubmitting: boolean;
};

function ReviewSheetEditor({
  plan,
  onComplete,
  isSaving,
  saveError,
  isSubmitting,
}: ReviewSheetEditorProps) {
  const summer = isSummerMode(plan.mode);
  const items = summer ? SUMMER_REVIEW_ITEMS : SCHOOL_REVIEW_ITEMS;
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (item: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const heading = summer
    ? "🔄 明日の予定を いっしょに確認しよう"
    : "🔄 今日のことを いっしょに確認しよう";

  const hint = summer
    ? "夏休みモード:明日のことを5つだけ。"
    : "今日のことをいっしょに確認しよう。";

  return (
    <>
      <h2>{heading}</h2>
      <p className="msm-hint">{hint}</p>
      <div className="msm-check-list">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className={`msm-check-row ${checked.has(item) ? "on" : ""}`}
            onClick={() => toggle(item)}
          >
            <span className="msm-box">✓</span>
            {item}
          </button>
        ))}
      </div>
      {saveError && <p className="msm-hint">{saveError}</p>}
      <button
        type="button"
        className="msm-btn-save"
        disabled={isSaving || isSubmitting}
        onClick={() => void onComplete()}
      >
        確認おわり!
      </button>
      <div className="msm-done-msg">
        <div className="msm-sparkle">✦ ✧ ✦</div>
        ママに「確認完了」が届いたよ 🎀
      </div>
    </>
  );
}

type ReviewSheetSessionProps = Omit<ReviewSheetProps, "open" | "resetKey">;

function ReviewSheetSession({
  plan,
  onClose,
  onComplete,
  isSaving,
}: ReviewSheetSessionProps) {
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    setSaveError(null);
    setIsSubmitting(true);
    try {
      await onComplete();
      setFinished(true);
      window.setTimeout(onClose, 1600);
    } catch {
      setSaveError("うまく届かなかったみたい。もういちど押してね");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MusumeBottomSheet
      open
      onClose={onClose}
      title="今日の振り返り"
      className={finished ? "finished" : ""}
    >
      <ReviewSheetEditor
        plan={plan}
        onComplete={handleComplete}
        isSaving={isSaving}
        saveError={saveError}
        isSubmitting={isSubmitting}
      />
    </MusumeBottomSheet>
  );
}

export function ReviewSheet({
  plan,
  open,
  resetKey,
  onClose,
  onComplete,
  isSaving,
}: ReviewSheetProps) {
  if (!open) return null;

  return (
    <ReviewSheetSession
      key={resetKey}
      plan={plan}
      onClose={onClose}
      onComplete={onComplete}
      isSaving={isSaving}
    />
  );
}
