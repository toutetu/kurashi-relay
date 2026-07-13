import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import type { Score } from "../../types/dashboard";

const scoreValues = [1, 2, 3, 4, 5] as const;

export function ScoreControl({
  label,
  value,
  onChange,
  personLabel,
  icon: Icon,
  disabled = false,
  tone = "red",
}: {
  label: string;
  value: Score;
  onChange: (score: Score) => void;
  personLabel: string;
  icon: LucideIcon;
  disabled?: boolean;
  tone?: "red" | "blue" | "daughter";
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1 flex items-center gap-1 text-xs font-bold text-[var(--muted-text)]">
        <Icon aria-hidden="true" size={14} />
        {label}
      </legend>
      <div className="grid grid-cols-5 gap-1">
        {scoreValues.map((score) => {
          const selected = score === value;
          return (
            <Button
              key={score}
              aria-pressed={selected}
              aria-label={`${personLabel}の${label}を${score}にする`}
              onClick={() => onChange(score)}
              disabled={disabled}
              variant={selected ? "solid" : "outline"}
              tone={tone}
              size="compact"
              className="min-w-0 rounded-lg px-1 text-sm font-black"
            >
              {score}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}
