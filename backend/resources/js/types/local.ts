import type { CurrentActivity } from "./dashboard";

export interface LocalActivity extends CurrentActivity {
  pausedAt: string | null;
  completedAt: string | null;
  totalPausedMilliseconds: number;
}

export function createLocalActivity(activity: CurrentActivity): LocalActivity {
  const now = new Date().toISOString();
  return {
    ...activity,
    pausedAt: activity.status === "paused" ? now : null,
    completedAt: activity.status === "completed" ? now : null,
    totalPausedMilliseconds: 0,
  };
}
