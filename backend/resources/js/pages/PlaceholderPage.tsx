import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Heart,
  Settings,
  Users,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

const placeholderContent: Record<
  string,
  { title: string; description: string; icon: LucideIcon }
> = {
  schedule: {
    title: "今日の予定",
    description: "予定の追加・編集は今後の実装で対応します。",
    icon: CalendarDays,
  },
  childPlan: {
    title: "娘の希望",
    description: "娘向けの独立した入力画面は今後の実装で対応します。",
    icon: Heart,
  },
  support: {
    title: "支援",
    description: "支援の引き継ぎ管理は今後の実装で対応します。",
    icon: Users,
  },
  reports: {
    title: "レポート",
    description: "支援者別レポートは今後の実装で対応します。",
    icon: FileText,
  },
  settings: {
    title: "設定",
    description: "アプリの設定画面は今後の実装で対応します。",
    icon: Settings,
  },
};

type PlaceholderPageProps = {
  page: keyof typeof placeholderContent;
  homeHref?: string;
};

export function PlaceholderPage({ page, homeHref }: PlaceholderPageProps) {
  const { title, description, icon: Icon } = placeholderContent[page];
  const targetHome = homeHref ?? "/";

  const linkClassName =
    "mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#236da8] px-5 py-2.5 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#ef767a]";

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-2xl place-items-center">
      <div className="w-full rounded-[1.75rem] border border-[#dce5ef] bg-white p-7 text-center shadow-[0_12px_36px_rgba(40,51,74,0.08)] sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-[#edf6ff] to-[#fff0f1] text-[#236da8]">
          <Icon aria-hidden="true" size={30} />
        </span>
        <h1 className="mt-5 text-2xl font-black text-[#28334a]">{title}</h1>
        <p className="mt-3 leading-relaxed text-[#667085]">{description}</p>
        <div className="mt-5 rounded-2xl bg-[#fff8db] px-4 py-3 font-bold text-[#77550b]">
          今後実装予定
        </div>
        <RouterLink to={targetHome} className={linkClassName}>
          <ArrowLeft aria-hidden="true" size={18} />
          ホームへ戻る
        </RouterLink>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const linkClassName =
    "mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#236da8] px-5 py-2.5 font-bold text-white";

  return (
    <div className="mx-auto max-w-xl rounded-[1.75rem] border border-[#f2b6b8] bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-black text-[#b84047]">404</p>
      <h1 className="mt-2 text-2xl font-black text-[#28334a]">
        ページが見つかりません
      </h1>
      <p className="mt-3 text-[#667085]">
        URLを確認するか、ホームへ戻ってください。
      </p>
      <RouterLink to="/" className={linkClassName}>
        ホームへ戻る
      </RouterLink>
    </div>
  );
}
