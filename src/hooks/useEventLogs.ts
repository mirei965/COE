import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EventLog } from '@/db/db';
import { eventLogSchema, type EventLogInput } from '@/lib/schemas';
import { useCallback } from 'react';

/**
 * EventLogを操作するカスタムフック
 */
export function useEventLogs(date: string) {
  const eventLogs = useLiveQuery(
    async () => {
      return await db.eventLogs
        .where('date')
        .equals(date)
        .sortBy('timestamp');
    },
    [date]
  );

  const addEventLog = useCallback(
    async (input: Omit<EventLogInput, 'date' | 'timestamp'>) => {
      // Zodでバリデーション
      const validated = eventLogSchema.parse({
        ...input,
        date,
        timestamp: Date.now(),
      });

      return await db.eventLogs.add(validated as EventLog);
    },
    [date]
  );

  const updateEventLog = useCallback(
    async (id: number, input: Partial<Omit<EventLogInput, 'date' | 'timestamp'>>) => {
      const existing = await db.eventLogs.get(id);
      if (!existing) {
        throw new Error(`EventLog with id ${id} not found`);
      }

      // Zodでバリデーション（部分更新）
      const validated = eventLogSchema.partial().parse({
        ...existing,
        ...input,
      });

      await db.eventLogs.update(id, validated as Partial<EventLog>);
    },
    []
  );

  const deleteEventLog = useCallback(async (id: number) => {
    await db.eventLogs.delete(id);
  }, []);

  return {
    eventLogs: eventLogs || [],
    addEventLog,
    updateEventLog,
    deleteEventLog,
    isLoading: eventLogs === undefined,
  };
}

/**
 * 日付範囲でEventLogを取得するフック
 */
export function useEventLogsByRange(
  startDate: string,
  endDate: string,
  type?: EventLog['type']
) {
  const eventLogs = useLiveQuery(
    async () => {
      let query = db.eventLogs
        .where('date')
        .between(startDate, endDate, true, true);

      if (type) {
        query = query.filter((log) => log.type === type);
      }

      const logs = await query.toArray();
      return logs.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.timestamp - b.timestamp;
      });
    },
    [startDate, endDate, type]
  );

  return {
    eventLogs: eventLogs || [],
    isLoading: eventLogs === undefined,
  };
}

