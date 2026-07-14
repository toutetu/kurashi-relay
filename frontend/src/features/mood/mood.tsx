import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { moods, type MoodId } from "./moods";

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
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={() => setMood(item.id)}
            className={`pressable inline-flex h-8 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[12.5px] font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
              selected
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-deep)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            <span aria-hidden="true">{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
