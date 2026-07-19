import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useFamilyToken } from "../features/auth/FamilyTokenProvider";

export function SettingsPage() {
  const { hasSavedToken, openFamilyTokenDialog, removeSavedToken } =
    useFamilyToken();

  return (
    <div className="mx-auto max-w-2xl">
      <header>
        <p className="text-sm font-bold text-[var(--muted-text)]">設定</p>
        <h1 className="mt-1 text-2xl font-black">家族の記録を守る</h1>
      </header>

      <section className="mt-5 rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-deep)]">
            <ShieldCheck aria-hidden="true" size={22} />
          </span>
          <div>
            <h2 className="font-black">家族のあいことば</h2>
            <p className="mt-1 leading-relaxed text-[var(--muted-text)]">
              APIへ送るあいことばは、この端末にだけ保存されます。
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm" role="status">
          状態：
          <strong>
            {hasSavedToken
              ? "この端末に保存されています"
              : "保存されていません"}
          </strong>
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button icon={KeyRound} onClick={openFamilyTokenDialog}>
            {hasSavedToken ? "あいことばを変更" : "あいことばを入力"}
          </Button>
          <Button
            variant="ghost"
            tone="neutral"
            icon={Trash2}
            disabled={!hasSavedToken}
            onClick={removeSavedToken}
          >
            この端末から削除
          </Button>
        </div>
      </section>
    </div>
  );
}
