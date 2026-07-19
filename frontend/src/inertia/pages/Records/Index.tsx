import { Head } from "@inertiajs/react";
import { ClipboardPenLine } from "lucide-react";
import { InertiaMemberRecordsSection } from "@/inertia/components/InertiaMemberRecordsSection";
import { InertiaRecordsDateNav } from "@/inertia/components/InertiaRecordsDateNav";
import { InertiaAppLayout } from "@/inertia/layouts/InertiaAppLayout";
import type { RecordsPageProps } from "@/inertia/types";

export default function RecordsIndex({
  date,
  today,
  child,
  mother,
  app,
}: RecordsPageProps) {
  const recordsPath = `/${app.inertiaPrefix}/records`;

  return (
    <InertiaAppLayout>
      <Head title="この日のきろく" />

      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--mother-blue-strong)]">
            <ClipboardPenLine aria-hidden="true" size={17} />
            きろくを見る
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">
            この日のきろく
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-text)]">
            むすめとママが、その日に何を何回やったかを見られます。
          </p>
        </div>

        <InertiaRecordsDateNav date={date} today={today} recordsPath={recordsPath} />

        <div className="mt-6 space-y-6">
          <InertiaMemberRecordsSection title="むすめ の きろく" payload={child} />
          <InertiaMemberRecordsSection title="ママ の きろく" payload={mother} />
        </div>
      </div>
    </InertiaAppLayout>
  );
}
