import { useTaskPersistence } from "../../taskRecords/useTaskPersistence";

export function useMamaKajiTasks() {
  return useTaskPersistence("mother");
}
