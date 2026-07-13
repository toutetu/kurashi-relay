import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type CardTone = "white" | "blue" | "yellow" | "red" | "daughter";
export type CardDensity = "compact" | "regular";

const toneClasses: Record<CardTone, string> = {
  white: "border-[var(--border)] bg-[var(--surface)]",
  blue: "border-[var(--mother-blue)] bg-gradient-to-br from-[var(--surface)] to-[var(--mother-blue-soft)]",
  yellow:
    "border-[var(--mother-yellow)] bg-gradient-to-br from-[var(--surface)] to-[var(--mother-yellow-soft)]",
  red: "border-[var(--mother-red)] bg-gradient-to-br from-[var(--surface)] to-[var(--mother-red-soft)]",
  daughter:
    "border-[var(--daughter-purple-soft)] bg-gradient-to-br from-[var(--daughter-surface)] via-[var(--daughter-blue)] to-[var(--daughter-purple-soft)]",
};

const iconClasses: Record<CardTone, string> = {
  white: "bg-[var(--neutral-soft)] text-[var(--text)]",
  blue: "bg-[var(--mother-blue-soft)] text-[var(--mother-blue-strong)]",
  yellow: "bg-[var(--mother-yellow-soft)] text-[var(--mother-yellow-strong)]",
  red: "bg-[var(--mother-red-soft)] text-[var(--mother-red-strong)]",
  daughter: "bg-white/75 text-[var(--daughter-purple)]",
};

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
  tone = "white",
  action,
  children,
  className = "",
  density = "regular",
}: DashboardCardProps) {
  const isCompact = density === "compact";
  return (
    <section
      id={id}
      className={`min-w-0 scroll-mt-24 rounded-[1.4rem] border shadow-[0_8px_22px_color-mix(in_srgb,var(--text)_8%,transparent)] ${isCompact ? "border-t-4 p-3 sm:p-3.5" : "p-4 sm:p-5"} ${toneClasses[tone]} ${className}`}
    >
      <div
        className={`${isCompact ? "mb-2.5" : "mb-4"} flex min-w-0 items-center justify-between gap-3`}
      >
        <h2
          className={`flex min-w-0 items-center gap-2 ${isCompact ? "text-base" : "text-lg"} font-bold tracking-tight text-[var(--text)]`}
        >
          <span
            className={`grid ${isCompact ? "size-8 rounded-xl" : "size-10 rounded-2xl"} shrink-0 place-items-center ${iconClasses[tone]}`}
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
