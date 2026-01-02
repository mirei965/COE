/**
 * 日付関連のユーティリティ関数
 */

/**
 * 日付をYYYY-MM-DD形式の文字列に変換
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
export function getTodayDateString(): string {
  return formatDate(new Date());
}

/**
 * YYYY-MM-DD形式の文字列をDateオブジェクトに変換
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 日付文字列が有効かチェック
 */
export function isValidDateString(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = parseDateString(dateString);
  return (
    date.getFullYear().toString() === dateString.split('-')[0] &&
    (date.getMonth() + 1).toString().padStart(2, '0') === dateString.split('-')[1] &&
    date.getDate().toString().padStart(2, '0') === dateString.split('-')[2]
  );
}

/**
 * 日付を日本語形式で表示（例: 2024年1月1日）
 */
export function formatDateJapanese(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateString(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 日付を相対的な表現で表示（今日、昨日、明日など）
 */
export function formatDateRelative(dateString: string): string {
  const today = getTodayDateString();
  const yesterday = formatDate(
    new Date(new Date().setDate(new Date().getDate() - 1))
  );
  const tomorrow = formatDate(
    new Date(new Date().setDate(new Date().getDate() + 1))
  );

  if (dateString === today) return '今日';
  if (dateString === yesterday) return '昨日';
  if (dateString === tomorrow) return '明日';

  return formatDateJapanese(dateString);
}

