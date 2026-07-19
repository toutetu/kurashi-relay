import { Head, Link } from "@inertiajs/react";
import { ClipboardList, Sparkles } from "lucide-react";
import { InertiaAppLayout } from "@/inertia/layouts/InertiaAppLayout";
import type { WelcomePageProps } from "@/inertia/types";

export default function Welcome({ recordsPath }: WelcomePageProps) {
  return (
    <InertiaAppLayout>
      <Head title="Inertia 基盤" />

      <div className="mx-auto max-w-xl rounded-[1.5rem] border border-[var(--card-neutral-border)] bg-white p-6 shadow-sm sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-deep)]">
          <Sparkles aria-hidden="true" size={24} />
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-tight">Inertia 基盤が有効です</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted-text)]">
          既存の React SPA と REST API はそのまま残し、Laravel から配信する Inertia
          ルートを段階的に追加していきます。
        </p>

        <div className="mt-6">
          <Link
            href={recordsPath}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            <ClipboardList aria-hidden="true" size={18} />
            きろくを見る（読み取り専用）
          </Link>
        </div>
      </div>
    </InertiaAppLayout>
  );
}
