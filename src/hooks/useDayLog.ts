import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DayLog } from '@/db/db';
import { dayLogSchema, type DayLogInput } from '@/lib/schemas';
import { useCallback } from 'react';

/**
 * DayLogを操作するカスタムフック
 * UIコンポーネントから直接DBを操作せず、このフックを経由させる
 */
export function useDayLog(date: string) {
  const dayLog = useLiveQuery(
    () => db.dayLogs.get(date),
    [date]
  );

  const upsertDayLog = useCallback(
    async (input: Partial<DayLogInput>) => {
      // Zodでバリデーション
      const validated = dayLogSchema.partial().parse({
        ...input,
        id: date,
      });

      const now = Date.now();
      const existing = await db.dayLogs.get(date);

      const dayLogData: DayLog = {
        id: date,
        ...existing,
        ...validated,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      await db.dayLogs.put(dayLogData);
    },
    [date]
  );

  const deleteDayLog = useCallback(async () => {
    await db.dayLogs.delete(date);
  }, [date]);

  return {
    dayLog,
    upsertDayLog,
    deleteDayLog,
    isLoading: dayLog === undefined,
  };
}

/**
 * 複数のDayLogを取得するフック
 */
export function useDayLogs(startDate: string, endDate: string) {
  const dayLogs = useLiveQuery(
    async () => {
      const logs = await db.dayLogs
        .where('id')
        .between(startDate, endDate, true, true)
        .toArray();
      return logs.sort((a, b) => a.id.localeCompare(b.id));
    },
    [startDate, endDate]
  );

  return {
    dayLogs: dayLogs || [],
    isLoading: dayLogs === undefined,
  };
}

