import { Head, useForm, usePage } from "@inertiajs/react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { InertiaAppLayout } from "@/inertia/layouts/InertiaAppLayout";
import type { SharedPageProps } from "@/inertia/types";
import { buildInertiaPath } from "@/navigation/inertiaPath";

export default function FamilyToken() {
  const { app } = usePage<SharedPageProps>().props;
  const form = useForm({
    token: "",
  });
  const familyTokenPath = buildInertiaPath(app.inertiaPrefix, "/family-token");

  return (
    <InertiaAppLayout>
      <Head title="あいことば" />

      <div className="mx-auto max-w-md rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xl sm:p-7">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-deep)]">
          <ShieldCheck aria-hidden="true" size={24} />
        </span>
        <h1 className="mt-4 text-xl font-black">あいことばを入力</h1>
        <p className="mt-2 leading-relaxed text-[var(--muted-text)]">
          家族の記録を守るためのあいことばです。このブラウザのセッションだけに保存します。
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            form.post(familyTokenPath);
          }}
        >
          <label className="block text-sm font-bold" htmlFor="family-token-input">
            あいことば
          </label>
          <input
            id="family-token-input"
            type="password"
            autoComplete="off"
            autoFocus
            value={form.data.token}
            onChange={(event) => form.setData("token", event.target.value)}
            className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-base outline-none transition focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--primary-soft)]"
          />
          {form.errors.token && (
            <p role="alert" className="text-sm font-bold text-[var(--danger-text)]">
              {form.errors.token}
            </p>
          )}
          <button
            type="submit"
            disabled={form.processing}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            <KeyRound aria-hidden="true" size={18} />
            {form.processing ? "確認中…" : "保存してつづける"}
          </button>
        </form>
      </div>
    </InertiaAppLayout>
  );
}
