import type { ApiTask, TaskRecord } from "../../../api/schemas/oshigotoSchema";

/** 時系列きろくを回数一覧用の行へ集計する */
export function aggregateRecordsToCountedTasks(
  records: TaskRecord[],
): ApiTask[] {
  const byTask = new Map<
    string,
    { title: string; count: number; order: number }
  >();

  records.forEach((record, index) => {
    const current = byTask.get(record.task);
    if (current) {
      current.count += 1;
      return;
    }

    byTask.set(record.task, {
      title: record.task_title ?? record.task,
      count: 1,
      order: index,
    });
  });

  return [...byTask.entries()]
    .sort((left, right) => left[1].order - right[1].order)
    .map(([slug, value]) => ({
      slug,
      title: value.title,
      category: null,
      point_value: 0,
      sort_order: value.order,
      count: value.count,
      last_record_id: null,
    }));
}
