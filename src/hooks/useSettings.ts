import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Settings } from '@/db/db';
import { useCallback } from 'react';

/**
 * 設定を操作するカスタムフック
 */
export function useSettings() {
  const settings = useLiveQuery(async () => {
    return await db.settings.toArray();
  });

  const getSetting = useCallback(async <T = unknown>(key: string): Promise<T | undefined> => {
    const setting = await db.settings.get(key);
    return setting?.value as T | undefined;
  }, []);

  const setSetting = useCallback(async <T = unknown>(key: string, value: T): Promise<void> => {
    await db.settings.put({ key, value });
  }, []);

  const deleteSetting = useCallback(async (key: string): Promise<void> => {
    await db.settings.delete(key);
  }, []);

  return {
    settings: settings || [],
    getSetting,
    setSetting,
    deleteSetting,
    isLoading: settings === undefined,
  };
}

/**
 * 特定の設定値を取得・設定するフック
 */
export function useSetting<T = unknown>(key: string, defaultValue?: T) {
  const { getSetting, setSetting } = useSettings();

  const setting = useLiveQuery(
    async () => {
      const value = await getSetting<T>(key);
      return value ?? defaultValue;
    },
    [key, defaultValue]
  );

  const updateSetting = useCallback(
    async (value: T) => {
      await setSetting(key, value);
    },
    [key, setSetting]
  );

  return {
    value: setting ?? defaultValue,
    setValue: updateSetting,
    isLoading: setting === undefined,
  };
}

