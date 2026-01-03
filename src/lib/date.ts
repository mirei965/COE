/**
 * ローカルタイムゾーンに基づいた日付操作ユーティリティ
 */

/**
 * 今日の日付を "YYYY-MM-DD" 形式で取得する（ローカル時間準拠）
 * @returns {string} YYYY-MM-DD
 */
export function getLocalISOString(): string {
  const now = new Date();
  return formatLocalDate(now);
}

/**
 * Dateオブジェクトを "YYYY-MM-DD" 形式に変換する（ローカル時間準拠）
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 過去の日付を取得する
 * @param daysAgo 何日前か
 * @returns {string} YYYY-MM-DD
 */
export function getPastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatLocalDate(date);
}
