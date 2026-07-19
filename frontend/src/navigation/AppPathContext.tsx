/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react";

export type AppPathMode = "spa" | "inertia";

export type AppPathContextValue = {
  mode: AppPathMode;
  pathPrefix: string;
};

const defaultValue: AppPathContextValue = {
  mode: "spa",
  pathPrefix: "",
};

const AppPathContext = createContext<AppPathContextValue>(defaultValue);

type AppPathProviderProps = {
  value: AppPathContextValue;
  children: ReactNode;
};

export function AppPathProvider({ value, children }: AppPathProviderProps) {
  return (
    <AppPathContext.Provider value={value}>{children}</AppPathContext.Provider>
  );
}

export function useAppPathContext(): AppPathContextValue {
  return useContext(AppPathContext);
}

export function useAppPath(spaPath: string): string {
  const { pathPrefix } = useAppPathContext();

  if (spaPath === "/") {
    return pathPrefix === "" ? "/" : pathPrefix;
  }

  return `${pathPrefix}${spaPath}`;
}

export function useHomePath(): string {
  return useAppPath("/");
}
