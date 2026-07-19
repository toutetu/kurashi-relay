let inertiaSessionAuth = false;
let inertiaPathPrefix = "/app";

export function setInertiaSessionAuth(enabled: boolean): void {
  inertiaSessionAuth = enabled;
}

export function isInertiaSessionAuth(): boolean {
  return inertiaSessionAuth;
}

export function setInertiaPathPrefix(prefix: string): void {
  inertiaPathPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
}

export function getInertiaPathPrefix(): string {
  return inertiaPathPrefix;
}
