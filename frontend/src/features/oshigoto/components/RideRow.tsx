import type { Ride } from "../data";

type RideRowProps = {
  ride: Ride;
  onToggle: (id: string) => void;
};

export function RideRow({ ride, onToggle }: RideRowProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(ride.id)}
      aria-pressed={ride.done}
      aria-label={`${ride.name}${ride.done ? "（行った）" : "（まだ）"}`}
      className={`pressable flex w-full items-center gap-2.5 border-b border-[var(--osh-line)] px-0.5 py-2 text-left transition active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
        ride.done
          ? "bg-[var(--osh-violet-soft)]/35"
          : "bg-transparent hover:bg-[var(--osh-card2)]/60"
      }`}
    >
      <span
        className={`grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2 text-[11px] font-black ${
          ride.done
            ? "border-[var(--osh-violet)] bg-[var(--osh-violet)] text-white"
            : "border-[var(--osh-line2)] bg-[var(--osh-card)] text-transparent"
        }`}
        aria-hidden="true"
      >
        ✓
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[11.5px] font-bold ${
            ride.done
              ? "text-[var(--osh-violet-deep)]"
              : "text-[var(--osh-ink-faint)]"
          }`}
        >
          {ride.name}
        </span>
        <span className="block truncate text-[10px] text-[var(--osh-ink-soft)]">
          {ride.placeEmoji} {ride.place}
        </span>
      </span>
    </button>
  );
}
