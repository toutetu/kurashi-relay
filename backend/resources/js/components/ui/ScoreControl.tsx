import { Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Score } from "../../types/dashboard";

const scoreValues = [1, 2, 3, 4, 5] as const;
const faceEmojis = ["😖", "😕", "🙂", "😊", "😆"] as const;

type ScoreTone = "primary" | "daughter" | "red" | "blue";

function resolveTone(tone: ScoreTone): "primary" | "daughter" {
  return tone === "daughter" ? "daughter" : "primary";
}

export function ScoreControl({
  label,
  value,
  onChange,
  personLabel,
  icon: Icon,
  disabled = false,
  tone = "primary",
  appearance = "numbers",
}: {
  label: string;
  value: Score;
  onChange: (score: Score) => void;
  personLabel: string;
  icon: LucideIcon;
  disabled?: boolean;
  tone?: ScoreTone;
  appearance?: "numbers" | "hearts" | "faces";
}) {
  const resolvedTone = resolveTone(tone);
  const isDaughter = resolvedTone === "daughter";
  const fillColor = isDaughter ? "var(--fuji)" : "var(--primary)";
  const softBg = isDaughter ? "var(--fuji-soft)" : "var(--primary-soft)";
  const deepColor = isDaughter ? "var(--fuji-deep)" : "var(--primary-deep)";

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1 flex items-center gap-1 text-xs font-bold text-[var(--muted-text)]">
        <Icon aria-hidden="true" size={14} />
        {label}
      </legend>
      <div className="grid grid-cols-5 gap-1.5">
        {scoreValues.map((score, index) => {
          const selected = score === value;
          const ariaLabel = `${personLabel}の${label}を${score}にする`;
          const baseClass =
            "pressable grid h-9 place-items-center rounded-xl border-[1.5px] transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed";

          if (appearance === "hearts") {
            const filled = score <= value;
            return (
              <button
                key={score}
                type="button"
                aria-pressed={selected}
                aria-label={ariaLabel}
                onClick={() => onChange(score)}
                disabled={disabled}
                className={baseClass}
                style={
                  filled
                    ? {
                        color: fillColor,
                        background: softBg,
                        borderColor: `color-mix(in srgb, ${fillColor} 35%, var(--line))`,
                      }
                    : {
                        color: "var(--faint)",
                        background: "var(--surface)",
                        borderColor: "var(--line)",
                      }
                }
              >
                <Heart
                  aria-hidden="true"
                  size={17}
                  fill={filled ? "currentColor" : "none"}
                  stroke="currentColor"
                />
              </button>
            );
          }

          if (appearance === "faces") {
            return (
              <button
                key={score}
                type="button"
                aria-pressed={selected}
                aria-label={ariaLabel}
                onClick={() => onChange(score)}
                disabled={disabled}
                className={`${baseClass} text-[17px] ${
                  selected ? "" : "grayscale opacity-75"
                }`}
                style={
                  selected
                    ? {
                        background: softBg,
                        borderColor: fillColor,
                        color: deepColor,
                      }
                    : {
                        background: "var(--surface)",
                        borderColor: "var(--line)",
                      }
                }
              >
                {faceEmojis[index]}
              </button>
            );
          }

          return (
            <button
              key={score}
              type="button"
              aria-pressed={selected}
              aria-label={ariaLabel}
              onClick={() => onChange(score)}
              disabled={disabled}
              className={`${baseClass} text-sm font-black`}
              style={
                selected
                  ? {
                      background: fillColor,
                      borderColor: fillColor,
                      color: "white",
                    }
                  : {
                      background: "var(--surface)",
                      borderColor: "var(--line)",
                      color: "var(--ink)",
                    }
              }
            >
              {score}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
