import { LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "solid" | "soft" | "outline" | "ghost";
type ButtonTone = "red" | "yellow" | "blue" | "neutral" | "daughter";
type ButtonSize = "compact" | "regular";

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
      className={`button button--variant-${variant} button--tone-${tone} pressable inline-flex items-center justify-center font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed ${sizeClasses[size]} ${className}`}
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
