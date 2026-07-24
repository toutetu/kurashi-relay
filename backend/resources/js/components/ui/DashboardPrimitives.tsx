import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { Button } from "./Button";

export function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  tone = "default",
  detail,
  ariaLabel,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  detail?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Button
      onClick={onClick}
      aria-label={ariaLabel}
      icon={Icon}
      purpose="secondary"
      tone={tone}
      size="compact"
      className="w-full min-w-0 justify-start text-left"
    >
      <span className="min-w-0 flex-1 break-words leading-tight">{label}</span>
      {detail ? <span className="shrink-0">{detail}</span> : null}
    </Button>
  );
}

export function StatusChip({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "yellow" | "red" | "daughter";
}) {
  const tones = {
    blue: "bg-[var(--mother-blue-soft)] text-[var(--mother-blue-strong)]",
    yellow: "bg-[var(--mother-yellow-soft)] text-[var(--mother-yellow-strong)]",
    red: "bg-[var(--mother-red-soft)] text-[var(--mother-red-strong)]",
    daughter: "bg-[var(--daughter-purple-soft)] text-[var(--daughter-purple)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-[var(--neutral-soft)] px-2.5 py-2 ${className}`}>
      <dt className="text-[0.7rem] font-bold text-[var(--muted-text)]">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-black text-[var(--text)]">
        {value}
      </dd>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border)] bg-white/70 p-3 text-center text-sm font-bold text-[var(--muted-text)]">
      {children}
    </p>
  );
}

export function SectionLink({
  to,
  children = "詳しく見る",
}: {
  to: string;
  children?: ReactNode;
}) {
  const className =
    "pressable inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-bold text-[var(--mother-blue-strong)] hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]";

  return (
    <RouterLink to={to} className={className}>
      {children}
      <ChevronRight aria-hidden="true" size={16} />
    </RouterLink>
  );
}
