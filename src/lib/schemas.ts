import { z } from 'zod';

/**
 * DayLog用のZodスキーマ
 * UIコンポーネントからの入力バリデーションに使用
 */
export const dayLogSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式である必要があります'),
  sleepStart: z.date().optional(),
  sleepEnd: z.date().optional(),
  sleepQuality: z.number().min(1).max(5).optional(),
  morningArousal: z.number().min(1).max(5).optional(),
  migraineProdrome: z.number().min(0).max(3).optional(),
  todayMode: z.enum(['normal', 'eco', 'rest']).optional(),
  isMenstruation: z.boolean().optional(),
  dayOverall: z.enum(['good', 'fair', 'bad']).optional(),
  dinnerAmount: z.enum(['light', 'medium', 'heavy']).optional(),
  bestMeasure: z.string().max(500).optional(),
  note: z.string().max(2000).optional(),
  echoSummary: z.string().max(1000).optional(),
});

export type DayLogInput = z.infer<typeof dayLogSchema>;

/**
 * EventLog用のZodスキーマ
 */
export const eventLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式である必要があります'),
  type: z.enum(['symptom', 'medicine', 'trigger', 'food']),
  name: z.string().min(1).max(100),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  memo: z.string().max(500).optional(),
  timestamp: z.number(),
});

export type EventLogInput = z.infer<typeof eventLogSchema>;

/**
 * RegimenHistory用のZodスキーマ
 */
export const regimenHistorySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式である必要があります'),
  type: z.enum(['maintenance', 'tapering', 'titration']),
  description: z.string().min(1).max(500),
  isActive: z.boolean(),
});

export type RegimenHistoryInput = z.infer<typeof regimenHistorySchema>;

