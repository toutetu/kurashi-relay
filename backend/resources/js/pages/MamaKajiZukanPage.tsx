import { useState } from "react";
import { MamaKajiPageShell } from "../features/mamakaji/components/MamaKajiPageShell";
import { MamaKajiTabs } from "../features/mamakaji/components/MamaKajiTabs";
import { TicketFooter } from "../features/mamakaji/components/PointsChip";
import { useMamaKaji } from "../features/mamakaji/context/MamaKajiContext";
import { SWEETS, type Sweet } from "../features/mamakaji/data";
import "../features/mamakaji/mamakaji.css";

const EMPTY_SLOTS = 4;

function RibbonHeaderIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 30 30"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="15" cy="15" r="11" fill="var(--mkj-rasp)" />
      <path
        d="M15 8a5 5 0 0 1 5 5 4 4 0 0 1-5 4 4 4 0 0 1-5-4 5 5 0 0 1 5-5z"
        fill="var(--mkj-caramel)"
      />
    </svg>
  );
}

function SweetTile({
  sweet,
  onSelect,
}: {
  sweet: Sweet;
  onSelect: (sweet: Sweet) => void;
}) {
  const isRare = sweet.rare === true;

  return (
    <button
      type="button"
      onClick={() => onSelect(sweet)}
      className={`pressable relative grid aspect-square w-full place-items-center rounded-2xl border-2 text-[25px] transition active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
        isRare
          ? "border-[var(--mkj-rasp)] bg-[var(--mkj-rasp-soft)]"
          : "border-[var(--mkj-caramel-soft)] bg-[var(--mkj-caramel-soft)]"
      }`}
      aria-label={`${sweet.name}の詳細を見る`}
    >
      <span aria-hidden="true">{sweet.emoji}</span>
      <span className="absolute -bottom-1 -right-1 rounded-full border border-[var(--mkj-line)] bg-[var(--mkj-card)] px-0.5 text-[13px] leading-none">
        {sweet.flag}
      </span>
    </button>
  );
}

function SweetDetail({
  sweet,
  onBack,
}: {
  sweet: Sweet;
  onBack: () => void;
}) {
  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={onBack}
        className="pressable mb-3 inline-flex items-center gap-1 text-[11.5px] font-extrabold text-[var(--mkj-ink-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        ← 図鑑にもどる
      </button>

      <header className="mb-3.5 flex items-center gap-3">
        <span
          className="grid size-[66px] shrink-0 place-items-center rounded-full border-2 border-[var(--mkj-line2)] bg-[var(--mkj-caramel-soft)] text-[42px]"
          aria-hidden="true"
        >
          {sweet.emoji}
        </span>
        <div>
          <h2 className="text-[19px] font-extrabold text-[var(--mkj-ink)]">
            {sweet.name}
          </h2>
          <p className="flex items-center gap-1 text-[12.5px] font-bold text-[var(--mkj-ink-soft)]">
            {sweet.flag} {sweet.country}
          </p>
        </div>
      </header>

      <div className="mb-2 flex items-start gap-2.5 rounded-[14px] border border-[var(--mkj-line)] bg-[var(--mkj-card2)] p-3">
        <span
          className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-[var(--mkj-sage-soft)] text-base"
          aria-hidden="true"
        >
          📍
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[var(--mkj-rasp-deep)]">
            どこの国？
          </p>
          <p className="text-[12.5px] leading-relaxed text-[var(--mkj-ink)]">
            {sweet.mapNote}
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-start gap-2.5 rounded-[14px] border border-[var(--mkj-line)] bg-[var(--mkj-card2)] p-3">
        <span
          className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-[var(--mkj-caramel-soft)] text-base"
          aria-hidden="true"
        >
          📖
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[var(--mkj-rasp-deep)]">
            つくりかた
          </p>
          <p className="text-[12.5px] leading-relaxed text-[var(--mkj-ink)]">
            {sweet.recipe.map((step, index) => (
              <span key={step}>
                {index > 0 && " "}
                {index + 1 === 1 ? "①" : index + 1 === 2 ? "②" : "③"}
                {step}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-start gap-2.5 rounded-[14px] border border-[var(--mkj-line)] bg-[var(--mkj-card2)] p-3">
        <span
          className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-[var(--mkj-rasp-soft)] text-base"
          aria-hidden="true"
        >
          🌏
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[var(--mkj-rasp-deep)]">
            豆知識
          </p>
          <p className="text-[12.5px] leading-relaxed text-[var(--mkj-ink)]">
            {sweet.culture}
          </p>
        </div>
      </div>

      <div
        className="mt-3 flex items-center justify-center gap-2 rounded-[14px] bg-[var(--mkj-rasp)] px-3 py-3 text-center text-[13.5px] font-extrabold text-white"
        aria-disabled="true"
        role="note"
      >
        <span>
          🎫 250ポイントで「おやつを作る券」と交換
          <small className="mt-0.5 block text-[10.5px] font-medium opacity-90">
            週末、娘と一緒に作る／自分へのごほうびに
          </small>
        </span>
      </div>
    </div>
  );
}

export function MamaKajiZukanPage() {
  const { collectedCount, points } = useMamaKaji();
  const [selectedSweet, setSelectedSweet] = useState<Sweet | null>(null);

  return (
    <MamaKajiPageShell>
      <MamaKajiTabs />

      {selectedSweet ? (
        <SweetDetail sweet={selectedSweet} onBack={() => setSelectedSweet(null)} />
      ) : (
        <>
          <header className="mb-1 flex items-center gap-2">
            <RibbonHeaderIcon />
            <h1 className="text-sm font-extrabold text-[var(--mkj-ink)]">
              わたしの 世界のおやつ図鑑
            </h1>
          </header>

          <p className="mb-3.5 text-[11px] text-[var(--mkj-ink-soft)]">
            🌍 集めるほど、行ってみたい国・作ってみたいおやつが増える
          </p>

          <div
            className="mb-3 grid grid-cols-4 gap-2.5 border-b-[3px] border-[var(--mkj-line2)] px-2 pb-2 pt-3"
            style={{ borderRadius: "0 0 4px 4px" }}
          >
            {SWEETS.map((sweet) => (
              <SweetTile
                key={sweet.id}
                sweet={sweet}
                onSelect={setSelectedSweet}
              />
            ))}
          </div>

          <div className="mb-3 grid grid-cols-4 gap-2.5 px-2">
            {Array.from({ length: EMPTY_SLOTS }, (_, index) => (
              <div
                key={`empty-${index}`}
                className="grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-[var(--mkj-line)] text-lg text-[var(--mkj-ink-faint)]"
                aria-hidden="true"
              >
                ?
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-0.5 pt-1.5 text-xs text-[var(--mkj-ink-soft)]">
            <span>
              集めたおやつ{" "}
              <b className="text-base font-extrabold text-[var(--mkj-rasp)]">
                {collectedCount}個
              </b>
            </span>
            <TicketFooter points={points} />
          </div>
        </>
      )}
    </MamaKajiPageShell>
  );
}
