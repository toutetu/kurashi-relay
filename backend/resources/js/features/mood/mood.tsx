/* eslint-disable react-refresh/only-export-components */
import { Check } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button } from "../../components/ui/Button";

export const moods = [
  { id: "sakura", emoji: "🌸", label: "さくら" },
  { id: "ai", emoji: "💙", label: "あい" },
  { id: "sora", emoji: "💧", label: "そら" },
  { id: "mori", emoji: "🌿", label: "もり" },
  { id: "yoru", emoji: "🌙", label: "よる" },
] as const;

export type MoodId = (typeof moods)[number]["id"];

const STORAGE_KEY = "kurashi-relay:mood";

function isMoodId(value: string | null): value is MoodId {
  return moods.some((mood) => mood.id === value);
}

function readStoredMood(): MoodId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isMoodId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "sakura";
}

type MoodContextValue = {
  mood: MoodId;
  setMood: (mood: MoodId) => void;
};

const MoodContext = createContext<MoodContextValue | null>(null);

export function MoodProvider({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState<MoodId>(readStoredMood);

  useEffect(() => {
    document.documentElement.dataset.mood = mood;
    try {
      localStorage.setItem(STORAGE_KEY, mood);
    } catch {
      /* ignore */
    }
  }, [mood]);

  return (
    <MoodContext.Provider value={{ mood, setMood }}>
      {children}
    </MoodContext.Provider>
  );
}

export function useMood() {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error("useMood must be used within MoodProvider");
  }
  return context;
}

export function MoodPicker() {
  const { mood, setMood } = useMood();

  return (
    <div
      role="group"
      aria-label="きょうのきぶんカラー"
      className="flex flex-wrap items-center gap-2"
    >
      {moods.map((item) => {
        const selected = item.id === mood;
        return (
          <Button
            key={item.id}
            type="button"
            purpose="selection"
            tone="default"
            size="compact"
            aria-pressed={selected}
            icon={selected ? Check : undefined}
            onClick={() => setMood(item.id)}
            className="!min-h-11 !rounded-full !px-3 !text-[12.5px]"
          >
            <span aria-hidden="true">{item.emoji}</span>
            <span>{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
