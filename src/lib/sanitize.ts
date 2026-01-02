/**
 * XSS対策用のサニタイズ関数
 * ユーザー入力のnoteやmemoを表示する前に使用
 */

/**
 * HTMLタグをエスケープして安全に表示する
 * @param text サニタイズするテキスト
 * @returns エスケープされたテキスト
 */
export function sanitizeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 改行を<br>タグに変換しつつ、HTMLタグをエスケープ
 * @param text サニタイズするテキスト
 * @returns 安全なHTML文字列
 */
export function sanitizeWithLineBreaks(text: string): string {
  return sanitizeText(text).replace(/\n/g, '<br>');
}

