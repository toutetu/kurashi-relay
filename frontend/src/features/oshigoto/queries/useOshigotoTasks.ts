import { useTaskPersistence } from "../../taskRecords/useTaskPersistence";

export function useOshigotoTasks() {
  return useTaskPersistence("child");
}
