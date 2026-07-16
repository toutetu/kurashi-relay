import type { ReactNode } from "react";
import "../oshigoto.css";

type OshigotoPageShellProps = {
  children: ReactNode;
};

export function OshigotoPageShell({ children }: OshigotoPageShellProps) {
  return (
    <div
      className="oshigoto-page -mx-4 -mt-5 min-h-[calc(100svh-3.5rem)] px-4 pb-10 pt-5 text-[var(--osh-ink)] sm:-mx-6 sm:px-6 md:-mt-7 md:pt-7 xl:-mx-8 xl:-mt-2 xl:px-8 xl:pt-2"
      style={{
        background: `
          radial-gradient(760px 360px at 82% -4%, var(--osh-violet-soft), transparent 62%),
          radial-gradient(680px 340px at 12% 4%, color-mix(in srgb, var(--osh-card) 25%, transparent), transparent 60%),
          linear-gradient(180deg, var(--osh-page1), var(--osh-page2) 42%)
        `,
      }}
    >
      <div className="mx-auto max-w-[420px]">{children}</div>
    </div>
  );
}
