import type { ReactNode } from "react";

type InertiaAppLayoutProps = {
  children: ReactNode;
};

export function InertiaAppLayout({ children }: InertiaAppLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
