import { Head } from "@inertiajs/react";
import { ShieldCheck } from "lucide-react";

export function InertiaSettingsContent() {
  return (
    <>
      <Head title="設定" />
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
              <h2 className="font-black">セッションのあいことば</h2>
              <p className="mt-1 leading-relaxed text-[var(--muted-text)]">
                Inertia 版では、あいことばはブラウザのセッションに保存されます。端末ごとに一度入力すれば、このブラウザを閉じるまで有効です。
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm" role="status">
            状態：<strong>このブラウザのセッションで認証済みです</strong>
          </p>
        </section>
      </div>
    </>
  );
}
