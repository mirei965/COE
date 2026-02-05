import { z } from 'zod';

/**
 * 自由記述（メモ）に対するバリデーション
 * 文字数制限と、簡易的なXSS対策
 */
export const noteSchema = z.string()
  .max(5000, "メモは5000文字以内で入力してください")
  .refine((val) => !/<script/i.test(val), {
    message: "セキュリティ上の理由により、スクリプトタグは含められません",
  })
  .optional();

/**
 * 基本的な日付形式チェック (YYYY-MM-DD)
 */
export const dateIdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式である必要があります');

/**
 * DayLog用のZodスキーマ
 */
export const dayLogSchema = z.object({
  id: dateIdSchema,
  sleepStart: z.date().optional(),
  sleepEnd: z.date().optional(),
  sleepQuality: z.number().min(1).max(5).optional(),
  morningArousal: z.number().min(1).max(5).optional(),
  migraineProdrome: z.number().min(0).max(3).optional(),
  fatigueLevel: z.number().min(0).max(3).optional(),
  todayMode: z.enum(['normal', 'eco', 'rest']).optional(),
  isMenstruation: z.boolean().optional(),
  dayOverall: z.enum(['good', 'fair', 'bad']).optional(),
  dinnerAmount: z.enum(['light', 'medium', 'heavy']).optional(),
  napDuration: z.number().min(0).max(480).optional(),
  bestMeasure: noteSchema,
  note: noteSchema,
  echoSummary: noteSchema,
}).passthrough();

export type DayLogInput = z.infer<typeof dayLogSchema>;

/**
 * EventLog用のZodスキーマ
 */
export const eventLogSchema = z.object({
  date: dateIdSchema,
  type: z.enum(['symptom', 'medicine', 'trigger', 'food']),
  name: z.string().min(1).max(100),
  severity: z.number().min(1).max(5),
  note: noteSchema,
  timestamp: z.number(),
}).passthrough();

export type EventLogInput = z.infer<typeof eventLogSchema>;

/**
 * RegimenHistory用のZodスキーマ
 */
export const regimenHistorySchema = z.object({
  startDate: dateIdSchema,
  type: z.enum(['maintenance', 'tapering', 'titration']),
  description: z.string().min(1).max(500),
  isActive: z.boolean(),
}).passthrough();

export type RegimenHistoryInput = z.infer<typeof regimenHistorySchema>;

/**
 * クリニック (Clinic)
 */
export const clinicSchema = z.object({
  name: z.string().max(100, "クリニック名は100文字補以内で入力してください"),
}).passthrough();

/**
 * 通院記録 (ClinicVisit)
 */
export const clinicVisitSchema = z.object({
  note: noteSchema,
  date: dateIdSchema,
}).passthrough();

/**
 * 給薬 (Medicine)
 */
export const medicineSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['regular', 'prn']),
}).passthrough();

/**
 * 旧validation.tsとの互換性のためのマップ
 * DBミドルウェアで使用
 */
export const schemaMap: Record<string, z.ZodType<unknown>> = {
  dayLogs: dayLogSchema,
  eventLogs: eventLogSchema,
  regimenHistory: regimenHistorySchema,
  clinics: clinicSchema,
  clinicVisits: clinicVisitSchema,
  medicines: medicineSchema,
};
