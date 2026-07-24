import { LoaderCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonPurpose = "primary" | "secondary" | "selection" | "low";
type ButtonTone = "default" | "danger";
type ButtonSize = "compact" | "regular";

const sizeClasses: Record<ButtonSize, string> = {
  compact: "min-h-11 gap-2 rounded-xl px-2.5 py-2 text-sm",
  regular: "min-h-12 gap-2 rounded-xl px-4 py-2.5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  purpose?: ButtonPurpose;
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  children?: ReactNode;
}

function isPressedValue(value: ButtonHTMLAttributes<HTMLButtonElement>["aria-pressed"]) {
  return value === true || value === "true";
}

export function Button({
  purpose = "primary",
  tone = "default",
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
  const selected = purpose === "selection" && isPressedValue(props["aria-pressed"]);

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`button button--purpose-${purpose} button--tone-${tone} pressable inline-flex items-center justify-center font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed ${selected ? "button--selected" : ""} ${sizeClasses[size]} ${className}`}
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
