import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type CardTone = "white" | "blue" | "yellow" | "red" | "daughter";

const toneClasses: Record<CardTone, string> = {
  white: "border-slate-200 bg-white",
  blue: "border-[#bcdcf7] bg-gradient-to-br from-white to-[#edf6ff]",
  yellow: "border-[#ead797] bg-gradient-to-br from-white to-[#fff8db]",
  red: "border-[#f2b6b8] bg-gradient-to-br from-white to-[#fff0f1]",
  daughter:
    "border-[#cfc1f5] bg-gradient-to-br from-[#f8fdff] via-[#dff4ff] to-[#eee8ff]",
};

const iconClasses: Record<CardTone, string> = {
  white: "bg-slate-100 text-slate-700",
  blue: "bg-[#d8ecff] text-[#236da8]",
  yellow: "bg-[#fff0b8] text-[#8a6411]",
  red: "bg-[#ffe0e1] text-[#b84047]",
  daughter: "bg-white/75 text-[#684baa]",
};

interface DashboardCardProps {
  id?: string;
  title: string;
  icon: LucideIcon;
  tone?: CardTone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardCard({
  id,
  title,
  icon: Icon,
  tone = "white",
  action,
  children,
  className = "",
}: DashboardCardProps) {
  return (
    <section
      id={id}
      className={`min-w-0 scroll-mt-24 rounded-[1.4rem] border p-4 shadow-[0_10px_30px_rgba(40,51,74,0.07)] sm:p-5 ${toneClasses[tone]} ${className}`}
    >
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-lg font-bold tracking-tight text-[#28334a]">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-2xl ${iconClasses[tone]}`}
          >
            <Icon aria-hidden="true" size={21} strokeWidth={2.2} />
          </span>
          <span>{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
