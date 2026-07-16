import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { OshigotoPageShell } from "../features/oshigoto/components/OshigotoPageShell";
import { OshigotoTabs } from "../features/oshigoto/components/OshigotoTabs";
import {
  INITIAL_ZUKAN,
  zukanCaptionLines,
  type ZukanEntry,
  type Zombie,
} from "../features/oshigoto/data";

function RibbonHeaderIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 30 30"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="15" cy="15" r="11" fill="var(--osh-rose)" />
      <path
        d="M15 8a5 5 0 0 1 5 5 4 4 0 0 1-5 4 4 4 0 0 1-5-4 5 5 0 0 1 5-5z"
        fill="var(--osh-violet)"
      />
    </svg>
  );
}

function ZukanCell({
  entry,
}: {
  entry: ZukanEntry;
}) {
  const { zombie, photoUrl } = entry;
  const isRare = zombie.rare === true;
  const captionLines = zukanCaptionLines(zombie.name);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative grid aspect-square w-full place-items-center rounded-2xl border-2 text-[26px] ${
          photoUrl
            ? "overflow-hidden border-[var(--osh-lav)] bg-[var(--osh-lav)]"
            : isRare
              ? "border-[var(--osh-rose)] bg-[var(--osh-rose-soft)]"
              : "border-[var(--osh-lav)] bg-[var(--osh-lav)]"
        }`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={zombie.name}
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden="true">{zombie.emoji}</span>
        )}
        {isRare && !photoUrl && (
          <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--osh-rose)] px-1.5 py-px text-[9px] font-extrabold text-white">
            レア
          </span>
        )}
      </div>
      <span className="text-center text-[9.5px] font-bold leading-tight text-[var(--osh-ink-soft)]">
        {captionLines.map((line, index) => (
          <span key={`${zombie.id}-${index}`}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}

export function OshigotoZukanPage() {
  const entries = INITIAL_ZUKAN;
  const [photoEntries, setPhotoEntries] = useState<ZukanEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoUrlsRef = useRef<string[]>([]);

  const collectedCount =
    entries.filter((entry) => entry.collected).length + photoEntries.length;

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const photoUrl = URL.createObjectURL(file);
    photoUrlsRef.current.push(photoUrl);

    const photoZombie: Zombie = {
      id: `photo-${Date.now()}`,
      emoji: "📷",
      name: "わたしの写真",
    };

    setPhotoEntries((prev) => [
      ...prev,
      { zombie: photoZombie, collected: true, photoUrl },
    ]);

    event.target.value = "";
  };

  useEffect(() => {
    const urls = photoUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <OshigotoPageShell>
      <OshigotoTabs />

      <header className="mb-3.5 flex items-center gap-2">
        <RibbonHeaderIcon />
        <h1 className="text-[15px] font-extrabold text-[var(--osh-ink)]">
          ゾンビ図鑑
        </h1>
        <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-[var(--osh-line2)] bg-[var(--osh-violet-soft)] px-2.5 py-1 text-[11.5px] font-extrabold text-[var(--osh-violet-deep)]">
          2025年 USJ
        </span>
      </header>

      <p className="mb-3.5 text-[11px] text-[var(--osh-ink-soft)]">
        🌙 満月のたび1体。USJの7エリアのゾンビたち
      </p>

      <div className="mb-3 grid grid-cols-4 gap-x-2 gap-y-3">
        {entries.map((entry) => (
          <ZukanCell key={entry.zombie.id} entry={entry} />
        ))}
        {photoEntries.map((entry) => (
          <ZukanCell key={entry.zombie.id} entry={entry} />
        ))}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="pressable grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-[var(--osh-pump)] bg-[var(--osh-pump-soft)] text-lg text-[var(--osh-pump-ink)] transition active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            aria-label="写真を登録"
          >
            📷
          </button>
          <span className="text-center text-[9.5px] font-bold leading-tight text-[var(--osh-ink-soft)]">
            写真を
            <br />
            登録
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoSelect}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--osh-line)] pt-2.5 text-xs text-[var(--osh-ink-soft)]">
        <span>
          集めたゾンビ{" "}
          <b className="text-base font-extrabold text-[var(--osh-violet)]">
            {collectedCount}体
          </b>
        </span>
        <span>USJ図鑑 7 / 7エリア</span>
      </div>

      <div
        className="mt-3 flex items-center gap-2.5 rounded-[14px] border border-dashed border-[var(--osh-line2)] bg-[var(--osh-card2)] px-3 py-2.5"
        aria-hidden="true"
      >
        <span className="text-[22px]">🏮</span>
        <div>
          <p className="text-[12.5px] font-extrabold text-[var(--osh-ink)]">
            世界のお化け・妖怪ずかん（もうすぐ）
          </p>
          <p className="text-[11px] text-[var(--osh-ink-soft)]">
            キョンシー🇨🇳・河童・天狗・ろくろ首🇯🇵…
          </p>
        </div>
      </div>
    </OshigotoPageShell>
  );
}
