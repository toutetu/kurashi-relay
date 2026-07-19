import { useCallback, useEffect, useRef, useState } from "react";
import { STAMP_SIZE, type KajiTask } from "../data";
import { JarGauge } from "./JarGauge";

type KajiCheerOverlayProps = {
  task: KajiTask;
  count: number;
  dropTick: number;
  onUndo: () => void;
  onClose: () => void;
};

const AUTO_CLOSE_MS = 2000;
const FADE_OUT_MS = 150;

export function KajiCheerOverlay({
  task,
  count,
  dropTick,
  onUndo,
  onClose,
}: KajiCheerOverlayProps) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 親の onClose はインライン関数で参照が変わるため ref 経由で最新を呼ぶ
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const remaining = Math.max(0, STAMP_SIZE - count);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      fadeTimerRef.current = null;
      onCloseRef.current();
    }, FADE_OUT_MS);
  }, []);

  const handleUndo = (event: React.MouseEvent) => {
    event.stopPropagation();
    onUndo();
    handleClose();
  };

  useEffect(() => {
    autoTimerRef.current = setTimeout(handleClose, AUTO_CLOSE_MS);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleClose]);

  return (
    <div
      className="mamakaji-page fixed inset-0 z-40"
      style={{
        background: `
          radial-gradient(760px 360px at 82% -4%, var(--mkj-rasp-soft), transparent 62%),
          radial-gradient(680px 360px at 12% 4%, color-mix(in srgb, var(--mkj-card) 25%, transparent), transparent 60%),
          linear-gradient(180deg, var(--mkj-page1), var(--mkj-page2) 42%)
        `,
        opacity: 0.97,
      }}
    >
      <div
        className={`flex h-full cursor-pointer items-center justify-center px-5 text-[var(--mkj-ink)] ${
          closing ? "mkj-cheer-fade-out" : "mkj-cheer-pop-in"
        }`}
        role="status"
        aria-live="polite"
        onClick={handleClose}
      >
        <div className="w-full max-w-[420px] text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mkj-line2)] bg-[var(--mkj-rasp-soft)] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[var(--mkj-rasp-deep)]">
          {task.emoji} {task.praise}
        </span>

        <div className="relative mx-auto my-2 w-[150px]">
          <span
            className="mkj-plus-one pointer-events-none absolute right-3.5 top-1.5 z-10 text-[19px] font-black text-[var(--mkj-rasp)]"
            aria-hidden="true"
          >
            +1
          </span>
          <span
            className="mkj-twinkle pointer-events-none absolute left-4 top-[30px] text-base"
            aria-hidden="true"
          >
            ✨
          </span>
          <span
            className="mkj-twinkle pointer-events-none absolute right-[18px] top-[50px] text-base [animation-delay:0.6s]"
            aria-hidden="true"
          >
            ⭐
          </span>
          <span
            className="mkj-twinkle pointer-events-none absolute bottom-6 left-[22px] text-base [animation-delay:1s]"
            aria-hidden="true"
          >
            ✨
          </span>
          <JarGauge count={count} dropTick={dropTick} size={150} />
        </div>

        <p className="text-[21px] font-extrabold text-[var(--mkj-ink)]">
          おつかれさま！
        </p>
        <p className="text-[12.5px] text-[var(--mkj-ink-soft)]">今日の家事</p>
        <p className="mt-2 text-2xl font-extrabold text-[var(--mkj-rasp)]">
          {count >= STAMP_SIZE ? 10 : count}
          <span className="text-xs font-bold text-[var(--mkj-ink-faint)]">
            {count >= STAMP_SIZE
              ? " / 10個 ・ まんたん！"
              : ` / ${STAMP_SIZE}個 ・ あと${remaining}個`}
          </span>
        </p>

        <button
          type="button"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center border-0 bg-transparent px-3 text-[12px] text-[var(--mkj-ink-faint)] transition-colors hover:text-[var(--mkj-ink-soft)] hover:underline focus-visible:text-[var(--mkj-ink-soft)] focus-visible:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          onClick={handleUndo}
        >
          ↩ とりけす
        </button>

        <p className="mt-7 text-xs text-[var(--mkj-ink-faint)]">タップで とじる</p>
        </div>
      </div>
    </div>
  );
}
