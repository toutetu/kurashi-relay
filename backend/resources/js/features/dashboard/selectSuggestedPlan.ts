import type { SchedulePlan } from "../../types/dashboard";

function isOpenPlan(plan: SchedulePlan): boolean {
  const settled = plan.outcome === "done" || plan.outcome === "skipped";
  return plan.recordable === true && !settled;
}

export type SuggestedPlanKind = "current" | "next";

export type SuggestedPlan = {
  plan: SchedulePlan;
  kind: SuggestedPlanKind;
};

/**
 * 実行中以外のとき、上部バーに出す予定を選ぶ。
 * 1. 現在時刻が枠内の未完了予定
 * 2. なければ次の未完了予定（開始が現在以降で最も早い）
 * 3. それもなければ、最も近い過去の未完了予定
 */
export function selectSuggestedPlan(
  plans: SchedulePlan[],
  now: Date = new Date(),
): SuggestedPlan | null {
  const openPlans = plans.filter(isOpenPlan);
  if (openPlans.length === 0) return null;

  const nowMs = now.getTime();
  const current = openPlans.find((plan) => {
    const start = new Date(plan.startAt).getTime();
    const end = new Date(plan.endAt).getTime();
    return start <= nowMs && nowMs < end;
  });
  if (current) return { plan: current, kind: "current" };

  const upcoming = openPlans
    .filter((plan) => new Date(plan.startAt).getTime() >= nowMs)
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  if (upcoming[0]) return { plan: upcoming[0], kind: "next" };

  const past = [...openPlans].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
  );
  return past[0] ? { plan: past[0], kind: "next" } : null;
}
