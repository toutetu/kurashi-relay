/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useTasksQuery } from "../../taskRecords/queries";
import { STAMP_SIZE, SWEETS } from "../data";

type MamaKajiContextValue = {
  points: number;
  collectedSweetIds: Set<string>;
  collectedCount: number;
};

const MamaKajiContext = createContext<MamaKajiContextValue | null>(null);

const INITIAL_COLLECTED_IDS = new Set(SWEETS.map((sweet) => sweet.id));

export function MamaKajiProvider({ children }: { children: ReactNode }) {
  const { data } = useTasksQuery("mother");
  const points = data?.summary.points ?? 0;
  const collectedSweetIds = INITIAL_COLLECTED_IDS;

  const value = useMemo(
    () => ({
      points,
      collectedSweetIds,
      collectedCount: collectedSweetIds.size,
    }),
    [points, collectedSweetIds],
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
