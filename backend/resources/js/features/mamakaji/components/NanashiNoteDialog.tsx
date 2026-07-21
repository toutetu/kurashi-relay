import { useEffect, useId, useRef, useState } from "react";

type NanashiNoteDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
};

export function NanashiNoteDialog({
  open,
  onCancel,
  onConfirm,
}: NanashiNoteDialogProps) {
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const hintId = useId();

  useEffect(() => {
    if (!open) return;
    setNote("");
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm(note.trim());
  };

  return (
    <div className="mamakaji-page fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--mkj-ink)_35%,transparent)]"
        onClick={onCancel}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-t-3xl border border-[var(--mkj-line)] bg-[var(--mkj-card)] p-4 shadow-[var(--mkj-shadow)] sm:rounded-3xl sm:p-5"
      >
        <h2
          id={titleId}
          className="text-base font-extrabold text-[var(--mkj-ink)]"
        >
          名もなき家事の内容
        </h2>
        <p id={hintId} className="mt-1 text-xs text-[var(--mkj-ink-soft)]">
          例: 麦茶を作った、ゴミ袋を替えた、献立を考えた
        </p>
        <textarea
          ref={inputRef}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          rows={3}
          placeholder="やったことを自由に書いてね（空でも記録できる）"
          className="mt-3 w-full resize-none rounded-2xl border border-[var(--mkj-line2)] bg-[var(--mkj-card2)] px-3 py-2.5 text-sm font-semibold text-[var(--mkj-ink)] placeholder:font-medium placeholder:text-[var(--mkj-ink-faint)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="pressable min-h-11 flex-1 rounded-full border border-[var(--mkj-line2)] bg-[var(--mkj-card)] text-sm font-extrabold text-[var(--mkj-ink-soft)]"
          >
            やめる
          </button>
          <button
            type="submit"
            className="pressable min-h-11 flex-1 rounded-full bg-[var(--mkj-rasp)] text-sm font-extrabold text-white"
          >
            記録する
          </button>
        </div>
      </form>
    </div>
  );
}
