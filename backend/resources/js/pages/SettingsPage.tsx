import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createCalendarConnectionPlaceholder,
  getFamilySettings,
  updateFamilySettings,
  type FamilySettings,
} from "../api/settings";
import { Button } from "../components/ui/Button";
import { useFamilyToken } from "../features/auth/FamilyTokenProvider";

const dayTypeLabels: Record<FamilySettings["day_type"], string> = {
  weekday: "平日",
  holiday: "休日",
  long_vacation: "長期休暇",
};

export function SettingsPage() {
  const { hasSavedToken, openFamilyTokenDialog, removeSavedToken } =
    useFamilyToken();
  const queryClient = useQueryClient();
  const [dayType, setDayType] =
    useState<FamilySettings["day_type"]>("weekday");
  const [message, setMessage] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["family-settings"],
    queryFn: ({ signal }) => getFamilySettings(signal),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setDayType(settingsQuery.data.day_type);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => updateFamilySettings({ day_type: dayType }),
    onSuccess: async () => {
      setMessage("日種別を保存しました。");
      await queryClient.invalidateQueries({ queryKey: ["family-settings"] });
    },
  });

  const calendarMutation = useMutation({
    mutationFn: () =>
      createCalendarConnectionPlaceholder("Googleカレンダー"),
    onSuccess: () => {
      setMessage("カレンダー接続を保存しました。予定画面から取り込みできます。");
    },
  });

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

      <section className="mt-5 rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <h2 className="font-black">日種別</h2>
        <p className="mt-1 text-sm text-[var(--muted-text)]">
          平日・休日・長期休暇で、ホームや予定の見え方を切り替えるための設定です。
        </p>
        <label className="mt-4 grid gap-1 text-sm">
          <span className="font-bold">きょうの日種別</span>
          <select
            value={dayType}
            onChange={(e) =>
              setDayType(e.target.value as FamilySettings["day_type"])
            }
            className="min-h-11 rounded-xl border border-[var(--line)] px-3"
          >
            {Object.entries(dayTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4">
          <Button
            disabled={saveMutation.isPending || settingsQuery.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "保存中…" : "日種別を保存"}
          </Button>
        </div>
      </section>

      <section className="mt-5 rounded-[var(--card-radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--amber-soft)] text-[var(--amber)]">
            <CalendarDays aria-hidden="true" size={22} />
          </span>
          <div>
            <h2 className="font-black">Googleカレンダー</h2>
            <p className="mt-1 leading-relaxed text-[var(--muted-text)]">
              予定画面の「カレンダーから取り込む」で、planned_activities
              へ取り込みます。OAuth本実装の前は、.env の
              GOOGLE_CALENDAR_ACCESS_TOKEN があれば実取得、なければ確認用サンプルです。
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="ghost"
            tone="neutral"
            disabled={calendarMutation.isPending}
            onClick={() => calendarMutation.mutate()}
          >
            {calendarMutation.isPending ? "保存中…" : "接続を登録"}
          </Button>
        </div>
      </section>

      {message && (
        <p className="mt-4 text-sm font-bold text-[var(--green)]" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
