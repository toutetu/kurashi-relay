import { Head } from "@inertiajs/react";
import { InertiaAppShell } from "@/inertia/layouts/InertiaAppShell";
import type { RecordsPageProps } from "@/inertia/types";
import { RecordsPage } from "@/pages/RecordsPage";

export default function RecordsIndex({ scope = "all" }: RecordsPageProps) {
  return (
    <InertiaAppShell>
      <Head title={scope === "child" ? "この日のきろく" : "この日の記録"} />
      <RecordsPage scope={scope} />
    </InertiaAppShell>
  );
}
