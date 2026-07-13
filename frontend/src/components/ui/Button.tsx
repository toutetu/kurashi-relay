import { LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "solid" | "soft" | "outline" | "ghost";
type ButtonTone = "red" | "yellow" | "blue" | "neutral" | "daughter";
type ButtonSize = "compact" | "regular";

const variantClasses: Record<ButtonVariant, Record<ButtonTone, string>> = {
  solid: {
    red: "bg-[var(--mother-red-strong)] text-white",
    yellow: "bg-[var(--mother-yellow)] text-[var(--text)]",
    blue: "bg-[var(--mother-blue-strong)] text-white",
    neutral: "bg-[var(--text)] text-white",
    daughter: "bg-[var(--daughter-purple)] text-white",
  },
  soft: {
    red: "bg-[var(--mother-red-soft)] text-[var(--mother-red-strong)]",
    yellow: "bg-[var(--mother-yellow-soft)] text-[var(--mother-yellow-strong)]",
    blue: "bg-[var(--mother-blue-soft)] text-[var(--mother-blue-strong)]",
    neutral: "bg-[var(--neutral-soft)] text-[var(--text)]",
    daughter: "bg-[var(--daughter-purple-soft)] text-[var(--daughter-purple)]",
  },
  outline: {
    red: "border border-[var(--mother-red)] bg-white text-[var(--mother-red-strong)]",
    yellow:
      "border border-[var(--mother-yellow)] bg-white text-[var(--mother-yellow-strong)]",
    blue: "border border-[var(--mother-blue)] bg-white text-[var(--mother-blue-strong)]",
    neutral: "border border-[var(--border)] bg-white text-[var(--text)]",
    daughter:
      "border border-[var(--daughter-purple)] bg-white text-[var(--daughter-purple)]",
  },
  ghost: {
    red: "text-[var(--mother-red-strong)] hover:bg-[var(--mother-red-soft)]",
    yellow:
      "text-[var(--mother-yellow-strong)] hover:bg-[var(--mother-yellow-soft)]",
    blue: "text-[var(--mother-blue-strong)] hover:bg-[var(--mother-blue-soft)]",
    neutral: "text-[var(--muted-text)] hover:bg-[var(--neutral-soft)]",
    daughter:
      "text-[var(--daughter-purple)] hover:bg-[var(--daughter-purple-soft)]",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  compact: "min-h-11 gap-2 rounded-xl px-2.5 py-2 text-sm",
  regular: "min-h-11 gap-2 rounded-xl px-4 py-2.5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "solid",
  tone = "blue",
  size = "regular",
  icon: Icon,
  loading = false,
  disabled = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`pressable inline-flex items-center justify-center font-bold shadow-sm transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses[size]} ${variantClasses[variant][tone]} ${className}`}
    >
      {loading ? (
        <LoaderCircle
          aria-hidden="true"
          size={18}
          className="shrink-0 animate-spin"
        />
      ) : Icon ? (
        <Icon aria-hidden="true" size={18} className="shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
