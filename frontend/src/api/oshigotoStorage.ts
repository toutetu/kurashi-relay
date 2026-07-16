import { z } from "zod";
import {
  memberSchema,
  tasksDataSchema,
  type Member,
  type TasksData,
} from "./schemas/oshigotoSchema";

const STORAGE_PREFIX = "kurashi:v1";

const pendingCreateSchema = z.object({
  kind: z.literal("create"),
  member: memberSchema,
  task: z.string(),
  date: z.string(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});

const pendingCancelSchema = z.object({
  kind: z.literal("cancel"),
  member: memberSchema,
  recordId: z.number().int(),
  createdAt: z.string(),
});

const pendingOperationSchema = z.discriminatedUnion("kind", [
  pendingCreateSchema,
  pendingCancelSchema,
]);

const queueSchema = z.array(pendingOperationSchema);

const snapshotSchema = z.object({
  data: tasksDataSchema,
  savedAt: z.number(),
  lastSyncedAt: z.string().nullable(),
});

const revealedSchema = z.array(z.number().int().positive());

export type PendingOperation = z.infer<typeof pendingOperationSchema>;
export type PendingCreate = z.infer<typeof pendingCreateSchema>;
export type PendingCancel = z.infer<typeof pendingCancelSchema>;

type Snapshot = z.infer<typeof snapshotSchema>;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const value = storage.getItem(key);
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorageが利用できない環境でも画面操作は継続する。
  }
}

function queueKey(member: Member) {
  return `${STORAGE_PREFIX}:${member}:queue`;
}

function revealedKey(member: Member) {
  return `${STORAGE_PREFIX}:${member}:revealed`;
}

function snapshotKey(member: Member, date: string) {
  return `${STORAGE_PREFIX}:${member}:${date}:snapshot`;
}

export function loadQueue(member: Member): PendingOperation[] {
  const parsed = queueSchema.safeParse(readJson(queueKey(member)));
  return parsed.success ? parsed.data : [];
}

export function saveQueue(member: Member, queue: PendingOperation[]) {
  writeJson(queueKey(member), queue);
}

export function enqueueOperation(operation: PendingOperation) {
  const queue = loadQueue(operation.member);
  const operationId = getOperationId(operation);
  if (queue.some((item) => getOperationId(item) === operationId)) return;
  saveQueue(operation.member, [...queue, operation]);
}

export function removeOperation(operation: PendingOperation) {
  saveQueue(
    operation.member,
    loadQueue(operation.member).filter(
      (item) => getOperationId(item) !== getOperationId(operation),
    ),
  );
}

export function getOperationId(operation: PendingOperation): string {
  return operation.kind === "create"
    ? `create:${operation.idempotencyKey}`
    : `cancel:${operation.recordId}:${operation.createdAt}`;
}

export function findPendingCreate(
  member: Member,
  task: string,
  date: string,
): PendingCreate | undefined {
  return loadQueue(member).find(
    (operation): operation is PendingCreate =>
      operation.kind === "create" &&
      operation.task === task &&
      operation.date === date,
  );
}

export function saveSnapshot(data: TasksData, synced: boolean) {
  const key = snapshotKey(data.member, data.date);
  const previous = snapshotSchema.safeParse(readJson(key));
  const snapshot: Snapshot = {
    data,
    savedAt: Date.now(),
    lastSyncedAt: synced
      ? new Date().toISOString()
      : previous.success
        ? previous.data.lastSyncedAt
        : null,
  };
  writeJson(key, snapshot);
}

export function loadLatestSnapshot(member: Member): Snapshot | undefined {
  const storage = getStorage();
  if (!storage) return undefined;
  const prefix = `${STORAGE_PREFIX}:${member}:`;
  const snapshots: Snapshot[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(prefix) || !key.endsWith(":snapshot")) continue;
      const parsed = snapshotSchema.safeParse(readJson(key));
      if (parsed.success) snapshots.push(parsed.data);
    }
  } catch {
    return undefined;
  }
  return snapshots.sort((a, b) => b.data.date.localeCompare(a.data.date))[0];
}

export function wasRewardRevealed(member: Member, milestone: number): boolean {
  const parsed = revealedSchema.safeParse(readJson(revealedKey(member)));
  return parsed.success && parsed.data.includes(milestone);
}

export function markRewardRevealed(member: Member, milestone: number) {
  const parsed = revealedSchema.safeParse(readJson(revealedKey(member)));
  const milestones = parsed.success ? parsed.data : [];
  if (milestones.includes(milestone)) return;
  writeJson(revealedKey(member), [...milestones, milestone]);
}
