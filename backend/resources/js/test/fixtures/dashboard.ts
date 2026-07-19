import type { DashboardResponse } from "../../types/dashboard";

export const dashboardResponse: DashboardResponse = {
  status: "success",
  data: {
    date: "2026-07-13",
    currentActivity: {
      id: "activity-test",
      title: "登校支援",
      category: "school_support",
      startedAt: "2026-07-13T08:12:00+09:00",
      status: "running",
      relatedPlanTitle: "娘の登校準備",
    },
    nextPlans: [
      {
        id: "plan-next",
        startAt: "2026-07-13T11:30:00+09:00",
        endAt: "2026-07-13T12:30:00+09:00",
        title: "学校への送迎・引き渡し",
        category: "school_support",
        source: "manual",
        status: "planned",
      },
    ],
    quickLogs: [{ type: "wake_prompt", label: "起床の声かけ", count: 1 }],
    conditions: {
      mother: { physical: 3, mood: 2, inputSource: "self" },
      daughter: { physical: 3, mood: 3, inputSource: "guardian_observation" },
    },
    childStrategy: {
      desiredOutcome: "短時間なら学校へ行きたい",
      firstStep: "朝食を食べる",
      requestedSupports: ["強く急かさないでほしい"],
      fallbackPlans: ["30分後にもう一度考える"],
      confidence: "slightly_anxious",
      note: "",
    },
    timeBalance: {
      sleepMinutes: 435,
      waitingMinutes: 130,
      activityMinutes: 225,
      recoveryMinutes: 80,
    },
    scheduleImpactSummary: {
      onScheduleCount: 2,
      delayedCount: 3,
      interruptedCount: 1,
      cancelledCount: 1,
      movedToNightCount: 1,
      lostMinutes: 130,
      mainCauses: [{ label: "登校支援", minutes: 60 }],
    },
    actionItems: [
      {
        id: "action-test",
        title: "学校との面談の持ち物を確認する",
        assignee: "母",
        dueAt: "2026-07-13T09:30:00+09:00",
        status: "not_started",
        priority: "high",
      },
    ],
    lastWar: {
      gameName: "ラストウォー",
      plannedTasks: ["デイリーミッション", "資源回収"],
      completedCount: 1,
      totalCount: 2,
      playMinutes: 35,
      recoveryEffect: 4,
    },
    scheduleComparisons: [
      {
        timeRange: {
          start: "2026-07-13T09:00:00+09:00",
          end: "2026-07-13T10:00:00+09:00",
        },
        plan: null,
        actuals: [
          {
            id: "entry-test",
            title: "家事",
            kind: "activity",
            category: "housework",
            startAt: "2026-07-13T09:10:00+09:00",
            endAt: "2026-07-13T09:50:00+09:00",
            details: ["洗濯"],
          },
        ],
        difference: {
          status: "unplanned_activity",
          startDelayMinutes: 0,
          plannedMinutes: 0,
          actualMinutes: 40,
          interruptionCount: 0,
          lostMinutes: 0,
          causes: ["隙間時間を有効活用"],
        },
      },
      {
        timeRange: {
          start: "2026-07-13T15:00:00+09:00",
          end: "2026-07-13T16:00:00+09:00",
        },
        plan: null,
        actuals: [],
        difference: {
          status: "no_plan_no_record",
          startDelayMinutes: 0,
          plannedMinutes: 0,
          actualMinutes: 0,
          interruptionCount: 0,
          lostMinutes: 0,
          causes: [],
        },
      },
    ],
  },
  meta: { timezone: "Asia/Tokyo" },
};
