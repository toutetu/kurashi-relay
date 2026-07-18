import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../../api/client";
import type { MusumePlan } from "../api/schemas/musumeSchema";
import {
  useCompleteMusumeReflection,
  useReplaceMusumeItems,
  useUpdateMusumePlan,
} from "../queries";
import {
  formatMusumeShortDate,
  getReflectionMode,
  getStartAnswer,
  getTodayAnswer,
  getTomorrowItemsAnswer,
  isReviewCompleted,
  isSummerMode,
  type OutlookSheetKind,
} from "../utils";
import { OutlookSheet } from "./OutlookSheet";
import { ReviewSheet } from "./ReviewSheet";

type MusumeHomeProps = {
  plan: MusumePlan;
  date: string;
};

export function MusumeHome({ plan, date }: MusumeHomeProps) {
  const [openSheet, setOpenSheet] = useState<OutlookSheetKind | "review" | null>(
    null,
  );
  const [sheetResetKey, setSheetResetKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const openSheetWithReset = (sheet: OutlookSheetKind | "review") => {
    setSheetResetKey((key) => key + 1);
    setOpenSheet(sheet);
  };

  const updatePlan = useUpdateMusumePlan(date);
  const replaceItems = useReplaceMusumeItems(date);
  const completeReflection = useCompleteMusumeReflection(date);

  const isSaving =
    updatePlan.isPending || replaceItems.isPending || completeReflection.isPending;

  const todayAnswer = getTodayAnswer(plan);
  const tomorrowAnswer = getTomorrowItemsAnswer(plan);
  const startAnswer = getStartAnswer(plan);
  const summer = isSummerMode(plan.mode);
  const reviewDone = isReviewCompleted(plan);

  const handleModeChange = async (mode: "summer" | "school") => {
    if (plan.mode === mode) return;
    setActionError(null);
    try {
      await updatePlan.mutateAsync({ planId: plan.id, body: { mode } });
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "保存に失敗しました。",
      );
    }
  };

  const handleWithMama = async (
    stateKey: "today_state" | "tomorrow_items_state" | "start_state",
  ) => {
    setActionError(null);
    try {
      await updatePlan.mutateAsync({
        planId: plan.id,
        body: { [stateKey]: "with_mama" },
      });
      setOpenSheet(null);
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "保存に失敗しました。",
      );
    }
  };

  const handleSaveItems = async (
    category: "today_task" | "tomorrow_item",
    titles: string[],
  ) => {
    setActionError(null);
    try {
      await replaceItems.mutateAsync({
        planId: plan.id,
        body: { category, titles },
      });
      setOpenSheet(null);
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "保存に失敗しました。",
      );
    }
  };

  const handleSaveStart = async (value: string) => {
    setActionError(null);
    try {
      if (summer) {
        await updatePlan.mutateAsync({
          planId: plan.id,
          body: { wake_up_time: value },
        });
      } else {
        await updatePlan.mutateAsync({
          planId: plan.id,
          body: {
            school_start_period: value as MusumePlan["school_start_period"],
          },
        });
      }
      setOpenSheet(null);
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "保存に失敗しました。",
      );
    }
  };

  const handleCompleteReflection = async () => {
    await completeReflection.mutateAsync({
      planId: plan.id,
      body: { mode: getReflectionMode(plan), note: null },
    });
  };

  const handleMemoBlur = async (value: string) => {
    const trimmed = value.trim();
    const current = plan.items.memo.map((item) => item.title).join("\n");
    if (trimmed === current) return;
    const titles = trimmed ? [trimmed] : [];
    setActionError(null);
    try {
      await replaceItems.mutateAsync({
        planId: plan.id,
        body: { category: "memo", titles },
      });
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : "保存に失敗しました。",
      );
    }
  };

  const memoValue = plan.items.memo.map((item) => item.title).join("\n");

  return (
    <>
      <div className="msm-lace-edge" aria-hidden="true" />
      <header className="msm-hero">
        <div className="msm-hero-row">
          <div className="msm-hello">
            <span aria-hidden="true">🌙</span> おかえり、あきちゃん
          </div>
          <div className="msm-date-chip">{formatMusumeShortDate(plan.plan_date)}</div>
        </div>
        <div className="msm-mode-row">
          <div className="msm-mode-toggle" role="group" aria-label="モード切替">
            <button
              type="button"
              className={summer ? "on" : ""}
              onClick={() => void handleModeChange("summer")}
              disabled={isSaving}
            >
              🌻 夏休み
            </button>
            <button
              type="button"
              className={!summer ? "on" : ""}
              onClick={() => void handleModeChange("school")}
              disabled={isSaving}
            >
              🏫 学校
            </button>
          </div>
          {summer && <span className="msm-mode-note">夏休み 1日目!</span>}
        </div>
      </header>

      {actionError && (
        <p className="msm-error" role="alert">
          {actionError}
        </p>
      )}

      <p className="msm-eyebrow msm-ribbon-line">あしたの じゅんび 🎀</p>
      <section className="msm-stack" aria-label="見通し3項目">
        <button
          type="button"
          className="msm-outlook"
          onClick={() => openSheetWithReset("today")}
        >
          <span className="msm-icon" aria-hidden="true">
            ❤️
          </span>
          <span className="msm-txt">
            <span className="msm-q">いまから何する?</span>
            <span
              className={`msm-ans ${todayAnswer.decided ? "decided" : ""}`}
            >
              {todayAnswer.text}
            </span>
          </span>
          <span className="msm-arrow" aria-hidden="true">
            ›
          </span>
        </button>

        <button
          type="button"
          className="msm-outlook"
          onClick={() => openSheetWithReset("tomorrow")}
        >
          <span className="msm-icon" aria-hidden="true">
            🎒
          </span>
          <span className="msm-txt">
            <span className="msm-q">明日 何がいる?</span>
            <span
              className={`msm-ans ${tomorrowAnswer.decided ? "decided" : ""}`}
            >
              {tomorrowAnswer.text}
            </span>
          </span>
          <span className="msm-arrow" aria-hidden="true">
            ›
          </span>
        </button>

        <button
          type="button"
          className="msm-outlook"
          onClick={() => openSheetWithReset("start")}
        >
          <span className="msm-icon" aria-hidden="true">
            {summer ? "⏰" : "🕒"}
          </span>
          <span className="msm-txt">
            <span className="msm-q">
              {summer ? "明日 何時に起きる?" : "明日 何時間目から登校?"}
            </span>
            <span
              className={`msm-ans ${startAnswer.decided ? "decided" : ""}`}
            >
              {startAnswer.text}
            </span>
          </span>
          <span className="msm-arrow" aria-hidden="true">
            ›
          </span>
        </button>
      </section>

      <p className="msm-eyebrow msm-ribbon-line">よるの おたのしみ 🌙</p>
      <section className="msm-stack">
        <Link to="/oshigoto" className="msm-oshigoto-door">
          <span className="msm-crescent" aria-hidden="true" />
          <span className="msm-star msm-s1" aria-hidden="true">
            ✦
          </span>
          <span className="msm-star msm-s2" aria-hidden="true">
            ✧
          </span>
          <span className="msm-star msm-s3" aria-hidden="true">
            ✦
          </span>
          <span className="msm-q">よるのハロウィン・ラリー</span>
          <span className="msm-sub">今日のおしごと、まとめて記録しよう 🧟</span>
          <span className="msm-go">おしごとへ ›</span>
        </Link>

        <div className="msm-card">
          <button
            type="button"
            className="msm-row-card"
            onClick={() => openSheetWithReset("review")}
          >
            <span className="msm-icon" aria-hidden="true">
              🔄
            </span>
            <span className="msm-txt" style={{ flex: 1 }}>
              <span className="msm-q">今日の振り返り</span>
              <br />
              <span className="msm-sub">19時ごろ・ママといっしょに</span>
            </span>
            {reviewDone && <span className="msm-badge-done">できた 🎀</span>}
            <span className="msm-arrow" style={{ color: "var(--msm-peri)" }}>
              ›
            </span>
          </button>
        </div>

        <div className="msm-card">
          <div className="msm-row-card" style={{ cursor: "default" }}>
            <span className="msm-icon" aria-hidden="true">
              ⭐
            </span>
            <span className="msm-q">メモ・思いついたこと</span>
          </div>
          <textarea
            className="msm-memo-look"
            defaultValue={memoValue}
            key={memoValue}
            placeholder="「USJでゾンビに会いたい」とか、なんでも書いてOK"
            onBlur={(event) => void handleMemoBlur(event.target.value)}
            maxLength={100}
          />
        </div>
      </section>

      <OutlookSheet
        kind={openSheet === "review" ? null : openSheet}
        plan={plan}
        open={openSheet !== null && openSheet !== "review"}
        resetKey={sheetResetKey}
        onClose={() => setOpenSheet(null)}
        onSaveItems={handleSaveItems}
        onSaveStart={handleSaveStart}
        onWithMama={handleWithMama}
        isSaving={isSaving}
      />

      <ReviewSheet
        plan={plan}
        open={openSheet === "review"}
        resetKey={sheetResetKey}
        onClose={() => setOpenSheet(null)}
        onComplete={handleCompleteReflection}
        isSaving={isSaving}
      />
    </>
  );
}