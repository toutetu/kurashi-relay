import type { Ride } from "../data";

const STORAGE_KEY = "kurashi:v1:child:usj-rides-2025";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadUsjRideDoneIds(): Set<string> {
  const storage = getStorage();
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((id): id is string => typeof id === "string" && id !== ""),
    );
  } catch {
    return new Set();
  }
}

export function saveUsjRideDoneIds(doneIds: Iterable<string>): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...doneIds]));
  } catch {
    // localStorage が使えない環境でも画面操作は継続する。
  }
}

export function applyPersistedUsjRideDone(rides: Ride[]): Ride[] {
  const doneIds = loadUsjRideDoneIds();
  return rides.map((ride) => ({
    ...ride,
    done: doneIds.has(ride.id),
  }));
}

export function persistUsjRides(rides: Ride[]): void {
  saveUsjRideDoneIds(
    rides.filter((ride) => ride.done).map((ride) => ride.id),
  );
}
