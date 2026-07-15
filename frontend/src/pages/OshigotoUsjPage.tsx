import { useState } from "react";
import { OshigotoPageShell } from "../features/oshigoto/components/OshigotoPageShell";
import { OshigotoTabs } from "../features/oshigoto/components/OshigotoTabs";
import { RideRow } from "../features/oshigoto/components/RideRow";
import { ZombieRevealModal } from "../features/oshigoto/components/ZombieRevealModal";
import {
  formatYen,
  GOODS,
  INITIAL_COINS,
  LIMITED_ZOMBIE,
  remainingMoonCountForGoods,
  RIDES_2025,
  type Goods,
  type Ride,
} from "../features/oshigoto/data";

function CheckHeaderIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 30 30"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="15" cy="15" r="11" fill="var(--osh-violet)" />
      <path
        d="M9 15l4 4 8-8"
        stroke="#fff"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SavingsHeaderIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 30 30"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="15" cy="15" r="11" fill="var(--osh-pump)" />
      <path
        d="M15 9v12M11 12h8"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoodsGoalSection() {
  const [selectedGoods, setSelectedGoods] = useState<Goods>(GOODS[0]);
  const coins = INITIAL_COINS;
  const progress = Math.min(100, (coins / selectedGoods.price) * 100);
  const remaining = remainingMoonCountForGoods(selectedGoods.price, coins);
  const canAfford = remaining <= 0;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <SavingsHeaderIcon />
        <h2 className="text-sm font-extrabold text-[var(--osh-ink)]">
          おこづかい ちょきん
        </h2>
      </div>

      <div className="rounded-2xl border border-[var(--osh-line)] bg-[var(--osh-card2)] p-3.5">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-[52px] shrink-0 place-items-center rounded-[13px] bg-[var(--osh-pump-soft)] text-[26px]">
            {selectedGoods.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[var(--osh-ink)]">
              {selectedGoods.name}
            </p>
            <p className="text-xs font-bold text-[var(--osh-ink-soft)]">
              目標 {formatYen(selectedGoods.price)}
            </p>
          </div>
        </div>

        <div
          className="mb-1.5 h-[13px] overflow-hidden rounded-full bg-[var(--osh-violet-soft)]"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`貯金の進み ${Math.round(progress)}パーセント`}
        >
          <span
            className="block h-full rounded-full bg-[var(--osh-pump)] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs font-bold text-[var(--osh-ink-soft)]">
          いま{" "}
          <b className="font-extrabold text-[var(--osh-pump-ink)]">
            {formatYen(coins)}
          </b>{" "}
          ／ {formatYen(selectedGoods.price)} ・{" "}
          {canAfford ? (
            <>
              <b className="font-extrabold text-[var(--osh-pump-ink)]">
                もう 買える！🎉
              </b>
            </>
          ) : (
            <>
              あと{" "}
              <b className="font-extrabold text-[var(--osh-pump-ink)]">
                {remaining}個
              </b>{" "}
              できたら 買える！
            </>
          )}
        </p>

        <p className="mt-3.5 text-[11.5px] font-extrabold text-[var(--osh-ink-soft)]">
          🎯 目標を えらぶ
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GOODS.map((goods) => {
            const selected = goods.id === selectedGoods.id;
            return (
              <button
                key={goods.id}
                type="button"
                onClick={() => setSelectedGoods(goods)}
                aria-pressed={selected}
                className={`pressable min-w-[86px] flex-1 rounded-[13px] border px-1.5 py-2 text-[11px] font-bold transition active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                  selected
                    ? "border-[var(--osh-pump)] bg-[var(--osh-pump-soft)] text-[var(--osh-ink)]"
                    : "border-[var(--osh-line2)] bg-[var(--osh-card)] text-[var(--osh-ink)]"
                }`}
              >
                <span className="mb-0.5 block text-xl">{goods.emoji}</span>
                {goods.name.replace("ハミクマ ", "")}
                <small className="mt-0.5 block font-bold text-[var(--osh-ink-soft)]">
                  {formatYen(goods.price)}
                </small>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[10px] text-[var(--osh-ink-faint)]">
          価格は2025年の参考＋今年の値上がり見込み
        </p>
      </div>
    </section>
  );
}

export function OshigotoUsjPage() {
  const [rides, setRides] = useState<Ride[]>(() =>
    RIDES_2025.map((ride) => ({ ...ride })),
  );
  const [revealed, setRevealed] = useState(false);

  const doneCount = rides.filter((ride) => ride.done).length;
  const totalRides = rides.length;

  const handleToggleRide = (id: string) => {
    setRides((prev) => {
      const currentDone = prev.filter((ride) => ride.done).length;
      const next = prev.map((ride) =>
        ride.id === id ? { ...ride, done: !ride.done } : ride,
      );
      const nextDone = next.filter((ride) => ride.done).length;
      if (currentDone < totalRides && nextDone === totalRides) {
        setRevealed(true);
      }
      return next;
    });
  };

  return (
    <OshigotoPageShell>
      <OshigotoTabs />

      <header className="mb-3.5 flex items-center gap-2">
        <CheckHeaderIcon />
        <h1 className="text-[15px] font-extrabold text-[var(--osh-ink)]">
          行った？チェック
        </h1>
        <span className="ml-auto inline-flex shrink-0 items-center rounded-full border border-[var(--osh-line2)] bg-[var(--osh-violet-soft)] px-2.5 py-1 text-[11.5px] font-extrabold text-[var(--osh-violet-deep)]">
          2025
        </span>
      </header>

      <div className="mb-3.5 flex items-center gap-2.5 rounded-2xl border border-[var(--osh-line)] bg-[var(--osh-card2)] px-3.5 py-2.5">
        <p className="text-2xl font-extrabold leading-none text-[var(--osh-violet)]">
          {doneCount}
          <small className="ml-0.5 text-[11px] font-bold text-[var(--osh-ink-faint)]">
            {" "}
            / {totalRides}
          </small>
        </p>
        <p className="ml-auto text-right text-[11px] font-extrabold leading-snug text-[var(--osh-rose)]">
          🎃 制覇で
          <br />
          限定ゾンビ
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--osh-line)] bg-[var(--osh-card)] shadow-[var(--osh-shadow-sm)]">
        {rides.map((ride) => (
          <RideRow key={ride.id} ride={ride} onToggle={handleToggleRide} />
        ))}
      </div>

      <GoodsGoalSection />

      {revealed && (
        <ZombieRevealModal
          zombie={LIMITED_ZOMBIE}
          onClose={() => setRevealed(false)}
          title="全部 制覇！"
          showCoin={false}
          showCarryover={false}
        />
      )}
    </OshigotoPageShell>
  );
}
