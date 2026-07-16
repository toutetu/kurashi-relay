import { useCallback, useEffect, useRef, useState } from "react";
import { STAMP_SIZE, type Task } from "../data";
import { MoonGauge } from "./MoonGauge";

type CheerOverlayProps = {
  task: Task;
  count: number;
  onUndo: () => void;
  onClose: () => void;
};

const AUTO_CLOSE_MS = 2000;
const FADE_OUT_MS = 150;

export function CheerOverlay({
  task,
  count,
  onUndo,
  onClose,
}: CheerOverlayProps) {
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
      className="oshigoto-page fixed inset-0 z-40"
      style={{
        background: `
          radial-gradient(760px 360px at 82% -4%, var(--osh-violet-soft), transparent 62%),
          radial-gradient(680px 360px at 12% 4%, color-mix(in srgb, var(--osh-card) 25%, transparent), transparent 60%),
          linear-gradient(180deg, var(--osh-page1), var(--osh-page2) 42%)
        `,
        opacity: 0.97,
      }}
    >
      <div
        className={`flex h-full cursor-pointer items-center justify-center px-5 text-[var(--osh-ink)] ${
          closing ? "osh-cheer-fade-out" : "osh-cheer-pop-in"
        }`}
        role="status"
        aria-live="polite"
        onClick={handleClose}
      >
        <div className="w-full max-w-[420px] text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--osh-line2)] bg-[var(--osh-violet-soft)] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[var(--osh-violet-deep)]">
          {task.emoji} {task.praise}
        </span>

        <div className="relative mx-auto my-2 w-[150px]">
          <span
            className="osh-plus-one pointer-events-none absolute right-3 top-2 z-10 text-[19px] font-black text-[var(--osh-rose)]"
            aria-hidden="true"
          >
            +1
          </span>
          <span
            className="osh-twinkle pointer-events-none absolute left-3 top-2 text-base"
            aria-hidden="true"
          >
            🦇
          </span>
          <span
            className="osh-twinkle pointer-events-none absolute right-2.5 top-11 text-base [animation-delay:0.6s]"
            aria-hidden="true"
          >
            ✨
          </span>
          <span
            className="osh-twinkle pointer-events-none absolute bottom-5 left-4 text-base [animation-delay:1s]"
            aria-hidden="true"
          >
            ⭐
          </span>
          <MoonGauge count={count} size={150} />
        </div>

        <p className="text-[21px] font-extrabold text-[var(--osh-ink)]">
          できたね！
        </p>
        <p className="text-[12.5px] text-[var(--osh-ink-soft)]">
          くらしのおしごと
        </p>
        <p className="mt-2 text-2xl font-extrabold text-[var(--osh-violet)]">
          {count >= STAMP_SIZE ? 10 : count}
          <span className="text-xs font-bold text-[var(--osh-ink-faint)]">
            {count >= STAMP_SIZE
              ? " / 10個 ・ 満月！"
              : ` / ${STAMP_SIZE}個 ・ あと${remaining}個`}
          </span>
        </p>

        <button
          type="button"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center border-0 bg-transparent px-3 text-[12px] text-[var(--osh-ink-faint)] transition-colors hover:text-[var(--osh-ink-soft)] hover:underline focus-visible:text-[var(--osh-ink-soft)] focus-visible:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          onClick={handleUndo}
        >
          ↩ とりけす
        </button>

        <p className="mt-7 text-xs text-[var(--osh-ink-faint)]">タップで とじる</p>
        </div>
      </div>
    </div>
  );
}
