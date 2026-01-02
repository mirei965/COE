import { z } from 'zod';

// 自由記述（メモ）に対するバリデーション
// 文字数制限と、簡易的なXSS対策
export const NoteSchema = z.string()
  .max(5000, "メモは5000文字以内で入力してください") // 少し余裕を持たせる
  .refine((val) => !/<script/i.test(val), {
    message: "セキュリティ上の理由により、スクリプトタグは含められません",
  })
  .optional();

// 基本的なIDバリデーション
export const DateIdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "IDはYYYY-MM-DD形式である必要があります");

// 1日のログ全体の保存用スキーマ (DayLog)
export const DayLogSchema = z.object({
  id: DateIdSchema,
  note: NoteSchema,
  echoSummary: NoteSchema,
  bestMeasure: NoteSchema,
  // 他のフィールドは型定義通りであれば基本OKだが、必要に応じて追加
}).passthrough(); // 定義していないフィールドは素通し（部分的な更新や他のフィールドを許容）

// イベントログ (EventLog)
export const EventLogSchema = z.object({
  name: z.string().max(100, "名称は100文字以内で入力してください"),
  note: NoteSchema,
  type: z.enum(['symptom', 'medicine', 'trigger', 'food']).optional(),
}).passthrough();

// レジメン履歴 (RegimenHistory)
export const RegimenHistorySchema = z.object({
  description: NoteSchema,
  startDate: DateIdSchema,
}).passthrough();

// クリニック (Clinic)
export const ClinicSchema = z.object({
  name: z.string().max(100, "クリニック名は100文字以内で入力してください"),
}).passthrough();

// 通院記録 (ClinicVisit)
export const ClinicVisitSchema = z.object({
  note: NoteSchema,
  date: DateIdSchema,
}).passthrough();

// バリデーション関数のマップ
export const SchemaMap: Record<string, z.ZodType<any>> = {
  dayLogs: DayLogSchema,
  eventLogs: EventLogSchema,
  regimenHistory: RegimenHistorySchema,
  clinics: ClinicSchema,
  clinicVisits: ClinicVisitSchema,
};
