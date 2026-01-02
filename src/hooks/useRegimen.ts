import { useLiveQuery } from 'dexie-react-hooks';
import { db, type RegimenHistory } from '@/db/db';
import { useCallback } from 'react';

export function useRegimen() {
  const activeRegimen = useLiveQuery(async () => {
    try {
      const all = await db.regimenHistory.toArray();
      // Find the last active entry (supporting both boolean true and number 1)
      const active = all.filter(r => r.isActive).pop();
      return active ?? null;
    } catch (e) {
      console.error(e);
      return null;
    }
  });

  const calculateDays = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    // Reset time to midnight for accurate day diff
    start.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const currentPhaseDay = activeRegimen ? calculateDays(activeRegimen.startDate) : 0;

  const setRegimen = useCallback(async (data: Omit<RegimenHistory, 'id' | 'createdAt' | 'isActive'>) => {
    // Current active regimen becomes inactive
    await db.transaction('rw', db.regimenHistory, async () => {
      // Manual filter to avoid index key errors
      const all = await db.regimenHistory.toArray();
      const activeItems = all.filter(r => r.isActive);
      
      // Deactivate all currently active
      for (const item of activeItems) {
        if (item.id) {
          await db.regimenHistory.update(item.id, { isActive: false });
        }
      }
      
      // Add new
      await db.regimenHistory.add({
        ...data,
        isActive: true,
        createdAt: Date.now(),
      });
    });
  }, []);

  return {
    activeRegimen,
    currentPhaseDay,
    setRegimen,
    isLoading: activeRegimen === undefined,
  };
}
