import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type CardTone = "neutral" | "blue" | "yellow" | "red" | "daughter";
export type CardDensity = "compact" | "regular";

interface DashboardCardProps {
  id?: string;
  title: string;
  icon: LucideIcon;
  tone?: CardTone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  density?: CardDensity;
}

export function DashboardCard({
  id,
  title,
  icon: Icon,
  tone = "neutral",
  action,
  children,
  className = "",
  density = "regular",
}: DashboardCardProps) {
  const isCompact = density === "compact";
  return (
    <section
      id={id}
      className={`dashboard-card dashboard-card--tone-${tone} flex h-full min-w-0 scroll-mt-24 flex-col rounded-[var(--card-radius)] border border-t-4 ${isCompact ? "p-3 sm:p-3.5" : "p-4 sm:p-5"} ${className}`}
    >
      <div
        className={`${isCompact ? "mb-2.5" : "mb-4"} flex min-w-0 items-center justify-between gap-3`}
      >
        <h2
          className={`flex min-w-0 items-center gap-2 ${isCompact ? "text-base" : "text-lg"} font-bold tracking-tight text-[var(--card-text)]`}
        >
          <span
            className={`dashboard-card__icon grid ${isCompact ? "size-8 rounded-xl" : "size-10 rounded-2xl"} shrink-0 place-items-center`}
          >
            <Icon
              aria-hidden="true"
              size={isCompact ? 17 : 21}
              strokeWidth={2.2}
            />
          </span>
          <span>{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
