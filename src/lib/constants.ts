/**
 * アプリケーション全体で使用する定数
 */

/**
 * 日付フォーマット: YYYY-MM-DD
 */
export const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * 睡眠品質の選択肢
 */
export const SLEEP_QUALITY_OPTIONS = [
  { value: 1, label: '非常に悪い' },
  { value: 2, label: '悪い' },
  { value: 3, label: '普通' },
  { value: 4, label: '良い' },
  { value: 5, label: '非常に良い' },
] as const;

/**
 * 朝の覚醒度の選択肢
 */
export const AROUSAL_OPTIONS = [
  { value: 1, label: '非常に低い' },
  { value: 2, label: '低い' },
  { value: 3, label: '普通' },
  { value: 4, label: '高い' },
  { value: 5, label: '非常に高い' },
] as const;

/**
 * 片頭痛前駆症状の選択肢
 */
export const MIGRAINE_PRODROME_OPTIONS = [
  { value: 0, label: 'なし' },
  { value: 1, label: '軽度' },
  { value: 2, label: '中等度' },
  { value: 3, label: '重度' },
] as const;

/**
 * 今日のモードの選択肢
 */
export const TODAY_MODE_OPTIONS = [
  { value: 'normal' as const, label: '通常' },
  { value: 'eco' as const, label: 'エコモード' },
  { value: 'rest' as const, label: '休息' },
] as const;

/**
 * 一日の総合評価の選択肢
 */
export const DAY_OVERALL_OPTIONS = [
  { value: 'good' as const, label: '良い' },
  { value: 'fair' as const, label: '普通' },
  { value: 'bad' as const, label: '悪い' },
] as const;

/**
 * 夕食の量の選択肢
 */
export const DINNER_AMOUNT_OPTIONS = [
  { value: 'light' as const, label: '少なめ' },
  { value: 'medium' as const, label: '普通' },
  { value: 'heavy' as const, label: '多め' },
] as const;

/**
 * イベントタイプの選択肢
 */
export const EVENT_TYPE_OPTIONS = [
  { value: 'symptom' as const, label: '症状' },
  { value: 'medicine' as const, label: '服薬' },
  { value: 'trigger' as const, label: 'トリガー' },
  { value: 'food' as const, label: '食事' },
] as const;

/**
 * 重症度の選択肢
 */
export const SEVERITY_OPTIONS = [
  { value: 1 as const, label: '軽度' },
  { value: 2 as const, label: '中等度' },
  { value: 3 as const, label: '重度' },
] as const;

