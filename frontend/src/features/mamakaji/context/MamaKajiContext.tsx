import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  INITIAL_POINTS,
  POINT_PER_STAMP,
  STAMP_SIZE,
  SWEETS,
  type Sweet,
} from "../data";

type MamaKajiContextValue = {
  points: number;
  collectedSweetIds: Set<string>;
  collectSweet: (sweet: Sweet) => void;
  collectedCount: number;
};

const MamaKajiContext = createContext<MamaKajiContextValue | null>(null);

const INITIAL_COLLECTED_IDS = new Set(SWEETS.map((sweet) => sweet.id));

export function MamaKajiProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState(INITIAL_POINTS);
  const [collectedSweetIds, setCollectedSweetIds] = useState<Set<string>>(
    () => new Set(INITIAL_COLLECTED_IDS),
  );

  const collectSweet = useCallback((sweet: Sweet) => {
    setCollectedSweetIds((prev) => {
      const next = new Set(prev);
      next.add(sweet.id);
      return next;
    });
    setPoints((current) => current + POINT_PER_STAMP);
  }, []);

  const value = useMemo(
    () => ({
      points,
      collectedSweetIds,
      collectSweet,
      collectedCount: collectedSweetIds.size,
    }),
    [points, collectedSweetIds, collectSweet],
  );

  return (
    <MamaKajiContext.Provider value={value}>{children}</MamaKajiContext.Provider>
  );
}

export function useMamaKaji() {
  const context = useContext(MamaKajiContext);
  if (!context) {
    throw new Error("useMamaKaji must be used within MamaKajiProvider");
  }
  return context;
}

export { STAMP_SIZE };
