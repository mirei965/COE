/**
 * グローバルな型定義
 * データベーススキーマとZodスキーマから再エクスポート
 */

export type {
  DayLog,
  EventLog,
  RegimenHistory,
  Settings,
} from '@/db/db';

export type {
  DayLogInput,
  EventLogInput,
  RegimenHistoryInput,
} from '@/lib/schemas';

