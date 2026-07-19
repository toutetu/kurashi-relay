export function resolveInertiaUrlPrefix(prefix: string): string {
  if (!prefix) {
    return "";
  }

  return prefix.startsWith("/") ? prefix : `/${prefix}`;
}

export function buildInertiaPath(prefix: string, spaPath: string): string {
  const base = resolveInertiaUrlPrefix(prefix);
  const normalizedSpaPath =
    spaPath === "" || spaPath === "/"
      ? "/"
      : spaPath.startsWith("/")
        ? spaPath
        : `/${spaPath}`;

  if (base === "") {
    return normalizedSpaPath;
  }

  if (normalizedSpaPath === "/") {
    return base;
  }

  return `${base}${normalizedSpaPath}`;
}
