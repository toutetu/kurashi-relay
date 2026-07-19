import { useState } from "react";
import type { DecidedWith } from "../api/schemas/musumeSchema";
import type { MusumePlan } from "../api/schemas/musumeSchema";
import {
  SCHOOL_START_OPTIONS,
  SCHOOL_TODAY_CHIPS,
  SCHOOL_TOMORROW_CHIPS,
  SUMMER_BEDTIME_OPTIONS,
  SUMMER_TODAY_CHIPS,
  SUMMER_TODAY_ITEM_CHIPS,
  SUMMER_TOMORROW_CHIPS,
  SUMMER_TOMORROW_PLAN_CHIPS,
  WAKE_UP_OPTIONS,
  type OutlookSheetKind,
} from "../utils";
import { MusumeBottomSheet } from "./MusumeBottomSheet";

type ItemCategory =
  "today_task" | "today_item" | "bedtime" | "tomorrow_plan" | "tomorrow_item";

type OutlookSheetProps = {
  kind: OutlookSheetKind | null;
  plan: MusumePlan;
  open: boolean;
  useTodayLabels: boolean;
  resetKey: number;
  onClose: () => void;
  onSaveItems: (
    category: ItemCategory,
    titles: string[],
    decidedWith: DecidedWith | null,
  ) => void;
  onSaveStart: (value: string | null, decidedWith: DecidedWith | null) => void;
  isSaving: boolean;
};

function getPresetChips(
  kind: OutlookSheetKind,
  plan: MusumePlan,
): readonly string[] {
  const summer = plan.mode === "summer";
  if (kind === "today") return summer ? SUMMER_TODAY_CHIPS : SCHOOL_TODAY_CHIPS;
  if (kind === "today_item") return SUMMER_TODAY_ITEM_CHIPS;
  if (kind === "bedtime") return SUMMER_BEDTIME_OPTIONS;
  if (kind === "tomorrow_plan") return SUMMER_TOMORROW_PLAN_CHIPS;
  if (kind === "tomorrow") {
    return summer ? SUMMER_TOMORROW_CHIPS : SCHOOL_TOMORROW_CHIPS;
  }
  return [];
}

function getInitialSelected(
  kind: OutlookSheetKind,
  plan: MusumePlan,
): string[] {
  if (kind === "today") return plan.items.today_task.map((item) => item.title);
  if (kind === "today_item") {
    return plan.items.today_item.map((item) => item.title);
  }
  if (kind === "bedtime") return plan.items.bedtime.map((item) => item.title);
  if (kind === "tomorrow_plan") {
    return plan.items.tomorrow_plan.map((item) => item.title);
  }
  if (kind === "tomorrow")
    return plan.items.tomorrow_item.map((item) => item.title);
  if (kind === "start") {
    if (plan.mode === "summer" && plan.wake_up_time) return [plan.wake_up_time];
    if (plan.mode !== "summer" && plan.school_start_period) {
      return [plan.school_start_period];
    }
  }
  return [];
}

function splitOtherTitle(
  title: string,
  presets: readonly string[],
): {
  chip: string | null;
  otherText: string;
} {
  if ((presets as readonly string[]).includes(title)) {
    return { chip: title, otherText: "" };
  }
  if (presets.includes("その他")) {
    return { chip: "その他", otherText: title };
  }
  return { chip: null, otherText: title };
}

function buildInitialSelection(kind: OutlookSheetKind, plan: MusumePlan) {
  const initial = getInitialSelected(kind, plan);
  if (kind === "start" || kind === "bedtime") {
    return { selected: initial, otherText: "" };
  }
  const presets = getPresetChips(kind, plan);
  const chips = new Set<string>();
  let other = "";
  for (const title of initial) {
    const split = splitOtherTitle(title, presets);
    if (split.chip) chips.add(split.chip);
    if (split.otherText) other = split.otherText;
  }
  return { selected: [...chips], otherText: other };
}

function itemCategoryForKind(kind: OutlookSheetKind): ItemCategory {
  if (kind === "today") return "today_task";
  if (kind === "today_item") return "today_item";
  if (kind === "bedtime") return "bedtime";
  if (kind === "tomorrow_plan") return "tomorrow_plan";
  return "tomorrow_item";
}

function questionForKind(
  kind: OutlookSheetKind,
  plan: MusumePlan,
  useTodayLabels: boolean,
): string {
  if (kind === "today") {
    return useTodayLabels ? "今日は なにする?" : "いまから何する?";
  }
  if (kind === "today_item") return "今日 何がいる?";
  if (kind === "bedtime") return "今日 何時に寝る?";
  if (kind === "tomorrow_plan") return "明日 なにする?";
  if (kind === "tomorrow") return "明日 何がいる?";
  return plan.mode === "summer"
    ? "明日 何時に起きる?"
    : "明日 何時間目から登校?";
}

function iconForKind(kind: OutlookSheetKind, plan: MusumePlan): string {
  if (kind === "today") return "❤️";
  if (kind === "today_item" || kind === "tomorrow") return "🎒";
  if (kind === "bedtime") return "⏰";
  if (kind === "tomorrow_plan") return "🔮";
  return plan.mode === "summer" ? "⏰" : "🕒";
}

type OutlookSheetEditorProps = {
  kind: OutlookSheetKind;
  plan: MusumePlan;
  useTodayLabels: boolean;
  onClose: () => void;
  onSaveItems: (
    category: ItemCategory,
    titles: string[],
    decidedWith: DecidedWith | null,
  ) => void;
  onSaveStart: (value: string | null, decidedWith: DecidedWith | null) => void;
  isSaving: boolean;
};

function OutlookSheetEditor({
  kind,
  plan,
  useTodayLabels,
  onClose,
  onSaveItems,
  onSaveStart,
  isSaving,
}: OutlookSheetEditorProps) {
  const initial = buildInitialSelection(kind, plan);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [otherText, setOtherText] = useState(initial.otherText);

  const summer = plan.mode === "summer";
  const isMulti = kind !== "start" && kind !== "bedtime";
  const presets = getPresetChips(kind, plan);

  const title = `${iconForKind(kind, plan)} ${questionForKind(
    kind,
    plan,
    useTodayLabels,
  )}`;

  const hint =
    kind === "today" || kind === "tomorrow_plan"
      ? "いくつ選んでもOK。あとから変えてもOK。"
      : kind === "today_item" || kind === "tomorrow"
        ? "よく使う物から選べるよ。"
        : "だいたいでOK。";

  const toggleChip = (chip: string) => {
    if (!isMulti) {
      setSelected([chip]);
      return;
    }
    setSelected((current) =>
      current.includes(chip)
        ? current.filter((item) => item !== chip)
        : [...current, chip],
    );
  };

  const buildTitles = (): string[] => {
    if (kind === "start") {
      return selected;
    }
    const titles: string[] = [];
    for (const chip of selected) {
      if (chip === "その他") {
        const trimmed = otherText.trim();
        if (trimmed) titles.push(trimmed);
      } else {
        titles.push(chip);
      }
    }
    return titles;
  };

  const handleSave = (decidedWith: DecidedWith | null) => {
    if (kind === "start") {
      const value = selected[0] ?? null;
      onSaveStart(value, value ? decidedWith : null);
      return;
    }
    onSaveItems(itemCategoryForKind(kind), buildTitles(), decidedWith);
  };

  const renderChips = () => {
    if (kind === "start") {
      if (summer) {
        return WAKE_UP_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`msm-chip ${selected.includes(option.value) ? "on" : ""}`}
            onClick={() => toggleChip(option.value)}
          >
            {option.label}
          </button>
        ));
      }
      return SCHOOL_START_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`msm-chip ${selected.includes(option.value) ? "on" : ""}`}
          onClick={() => toggleChip(option.value)}
        >
          {option.label}
        </button>
      ));
    }

    return presets.map((chip) => (
      <button
        key={chip}
        type="button"
        className={`msm-chip ${selected.includes(chip) ? "on" : ""}`}
        onClick={() => toggleChip(chip)}
      >
        {chip}
      </button>
    ));
  };

  return (
    <>
      <h2>{title}</h2>
      <p className="msm-hint">{hint}</p>
      <div className="msm-chips">{renderChips()}</div>
      {isMulti && selected.includes("その他") && (
        <input
          type="text"
          className="msm-other-input"
          value={otherText}
          onChange={(event) => setOtherText(event.target.value)}
          placeholder="自由に書いてね"
          maxLength={100}
        />
      )}
      <div className="msm-soft-actions">
        <button
          type="button"
          className="msm-btn-mama"
          disabled={isSaving}
          onClick={() => handleSave("mama")}
        >
          🎀 ママと決めた
        </button>
        <button type="button" className="msm-btn-later" onClick={onClose}>
          今は決めない
        </button>
      </div>
      <button
        type="button"
        className="msm-btn-save"
        disabled={isSaving}
        onClick={() => handleSave(null)}
      >
        これにする!
      </button>
    </>
  );
}

export function OutlookSheet({
  kind,
  plan,
  open,
  useTodayLabels,
  resetKey,
  onClose,
  onSaveItems,
  onSaveStart,
  isSaving,
}: OutlookSheetProps) {
  if (!kind) return null;

  const title = questionForKind(kind, plan, useTodayLabels);

  return (
    <MusumeBottomSheet open={open} onClose={onClose} title={title}>
      {open && (
        <OutlookSheetEditor
          key={`${kind}-${resetKey}`}
          kind={kind}
          plan={plan}
          useTodayLabels={useTodayLabels}
          onClose={onClose}
          onSaveItems={onSaveItems}
          onSaveStart={onSaveStart}
          isSaving={isSaving}
        />
      )}
    </MusumeBottomSheet>
  );
}
