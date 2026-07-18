import { useState } from "react";
import type { MusumePlan } from "../api/schemas/musumeSchema";
import {
  SCHOOL_START_OPTIONS,
  SCHOOL_TODAY_CHIPS,
  SCHOOL_TOMORROW_CHIPS,
  SUMMER_TODAY_CHIPS,
  SUMMER_TOMORROW_CHIPS,
  WAKE_UP_OPTIONS,
  type OutlookSheetKind,
} from "../utils";
import { MusumeBottomSheet } from "./MusumeBottomSheet";

type OutlookSheetProps = {
  kind: OutlookSheetKind | null;
  plan: MusumePlan;
  open: boolean;
  resetKey: number;
  onClose: () => void;
  onSaveItems: (category: "today_task" | "tomorrow_item", titles: string[]) => void;
  onSaveStart: (value: string) => void;
  onWithMama: (stateKey: "today_state" | "tomorrow_items_state" | "start_state") => void;
  isSaving: boolean;
};

function getPresetChips(kind: OutlookSheetKind, plan: MusumePlan): readonly string[] {
  const summer = plan.mode === "summer";
  if (kind === "today") return summer ? SUMMER_TODAY_CHIPS : SCHOOL_TODAY_CHIPS;
  if (kind === "tomorrow") {
    return summer ? SUMMER_TOMORROW_CHIPS : SCHOOL_TOMORROW_CHIPS;
  }
  return [];
}

function getInitialSelected(kind: OutlookSheetKind, plan: MusumePlan): string[] {
  if (kind === "today") return plan.items.today_task.map((item) => item.title);
  if (kind === "tomorrow") return plan.items.tomorrow_item.map((item) => item.title);
  if (kind === "start") {
    if (plan.mode === "summer" && plan.wake_up_time) return [plan.wake_up_time];
    if (plan.mode !== "summer" && plan.school_start_period) {
      return [plan.school_start_period];
    }
  }
  return [];
}

function splitOtherTitle(title: string, presets: readonly string[]): {
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
  if (kind === "start") {
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

type OutlookSheetEditorProps = {
  kind: OutlookSheetKind;
  plan: MusumePlan;
  onClose: () => void;
  onSaveItems: (category: "today_task" | "tomorrow_item", titles: string[]) => void;
  onSaveStart: (value: string) => void;
  onWithMama: (stateKey: "today_state" | "tomorrow_items_state" | "start_state") => void;
  isSaving: boolean;
};

function OutlookSheetEditor({
  kind,
  plan,
  onClose,
  onSaveItems,
  onSaveStart,
  onWithMama,
  isSaving,
}: OutlookSheetEditorProps) {
  const initial = buildInitialSelection(kind, plan);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [otherText, setOtherText] = useState(initial.otherText);

  const summer = plan.mode === "summer";
  const isMulti = kind !== "start";
  const presets = getPresetChips(kind, plan);

  const title =
    kind === "today"
      ? "❤️ いまから何する?"
      : kind === "tomorrow"
        ? "🎒 明日 何がいる?"
        : summer
          ? "⏰ 明日 何時に起きる?"
          : "🕒 明日 何時間目から登校?";

  const hint =
    kind === "today"
      ? "いくつ選んでもOK。あとから変えてもOK。"
      : kind === "tomorrow"
        ? "よく使う物から選べるよ。"
        : "だいたいでOK。";

  const stateKey =
    kind === "today"
      ? "today_state"
      : kind === "tomorrow"
        ? "tomorrow_items_state"
        : "start_state";

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

  const handleSave = () => {
    if (kind === "start") {
      const value = selected[0];
      if (value) onSaveStart(value);
      return;
    }
    onSaveItems(
      kind === "today" ? "today_task" : "tomorrow_item",
      buildTitles(),
    );
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
          onClick={() => onWithMama(stateKey)}
        >
          🎀 ママと決める
        </button>
        <button type="button" className="msm-btn-later" onClick={onClose}>
          今は決めない
        </button>
      </div>
      <button
        type="button"
        className="msm-btn-save"
        disabled={isSaving}
        onClick={handleSave}
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
  resetKey,
  onClose,
  onSaveItems,
  onSaveStart,
  onWithMama,
  isSaving,
}: OutlookSheetProps) {
  if (!kind) return null;

  const title =
    kind === "today"
      ? "いまから何する?"
      : kind === "tomorrow"
        ? "明日 何がいる?"
        : plan.mode === "summer"
          ? "明日 何時に起きる?"
          : "明日 何時間目から登校?";

  return (
    <MusumeBottomSheet open={open} onClose={onClose} title={title}>
      {open && (
        <OutlookSheetEditor
          key={`${kind}-${resetKey}`}
          kind={kind}
          plan={plan}
          onClose={onClose}
          onSaveItems={onSaveItems}
          onSaveStart={onSaveStart}
          onWithMama={onWithMama}
          isSaving={isSaving}
        />
      )}
    </MusumeBottomSheet>
  );
}
