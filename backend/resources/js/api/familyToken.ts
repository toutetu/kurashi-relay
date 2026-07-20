const FAMILY_TOKEN_STORAGE_KEY = "kurashi-relay:family-token";

type FamilyTokenRequiredListener = () => void;

const requiredListeners = new Set<FamilyTokenRequiredListener>();

let volatileToken: string | null | undefined;
let tokenRequired = false;
let authGeneration = 0;

export type FamilyTokenAuthSnapshot = {
  token: string | null;
  generation: number;
};

function bumpAuthGeneration(): void {
  authGeneration += 1;
}

function normalizeToken(value: string | null): string | null {
  // ひらがな・漢字を含むあいことばでも、端末とサーバーで表記ゆれしないよう NFC に揃える。
  const normalized = value?.normalize("NFC").trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function getFamilyToken(): string | null {
  if (volatileToken !== undefined) {
    return volatileToken;
  }

  try {
    volatileToken = normalizeToken(
      window.localStorage.getItem(FAMILY_TOKEN_STORAGE_KEY),
    );
  } catch {
    volatileToken = null;
  }

  return volatileToken;
}

export function saveFamilyToken(value: string): string {
  const normalized = normalizeToken(value);
  if (normalized === null) {
    throw new Error("あいことばを入力してください。");
  }

  volatileToken = normalized;
  tokenRequired = false;
  bumpAuthGeneration();
  try {
    window.localStorage.setItem(FAMILY_TOKEN_STORAGE_KEY, normalized);
  } catch {
    // localStorageが利用できない環境では、このタブを閉じるまでメモリ上で保持する。
  }

  return normalized;
}

export function clearFamilyToken(): void {
  volatileToken = null;
  tokenRequired = false;
  bumpAuthGeneration();
  try {
    window.localStorage.removeItem(FAMILY_TOKEN_STORAGE_KEY);
  } catch {
    // 保存できていない場合も、メモリ上の値は上で破棄済み。
  }
}

export function createFamilyTokenHeaders(initial?: HeadersInit): Headers {
  const headers = new Headers(initial);
  const token = getFamilyToken();
  if (token !== null) headers.set("X-Family-Token", token);
  return headers;
}

export function captureFamilyTokenAuth(): FamilyTokenAuthSnapshot {
  return {
    token: getFamilyToken(),
    generation: authGeneration,
  };
}

export function requireFamilyToken(snapshot: FamilyTokenAuthSnapshot): void {
  if (snapshot.generation !== authGeneration) {
    return;
  }

  if (tokenRequired) {
    return;
  }

  clearFamilyToken();
  tokenRequired = true;
  requiredListeners.forEach((listener) => listener());
}

export function isFamilyTokenRequired(): boolean {
  return tokenRequired;
}

export function subscribeFamilyTokenRequired(
  listener: FamilyTokenRequiredListener,
): () => void {
  requiredListeners.add(listener);
  if (tokenRequired) queueMicrotask(listener);
  return () => requiredListeners.delete(listener);
}

export function resetFamilyTokenStateForTests(): void {
  volatileToken = undefined;
  tokenRequired = false;
  authGeneration = 0;
  try {
    window.localStorage.removeItem(FAMILY_TOKEN_STORAGE_KEY);
  } catch {
    // テスト環境でlocalStorageが使えない場合も状態だけは初期化する。
  }
}
