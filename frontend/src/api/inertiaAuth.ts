let inertiaSessionAuth = false;
let inertiaPathPrefix = "";

export function setInertiaSessionAuth(enabled: boolean): void {
  inertiaSessionAuth = enabled;
}

export function isInertiaSessionAuth(): boolean {
  return inertiaSessionAuth;
}

export function setInertiaPathPrefix(prefix: string): void {
  if (!prefix || prefix === "/") {
    inertiaPathPrefix = "";
    return;
  }

  inertiaPathPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
}

export function getInertiaPathPrefix(): string {
  return inertiaPathPrefix;
}
