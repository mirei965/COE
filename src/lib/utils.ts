import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * classNameをマージするユーティリティ関数
 * clsxとtailwind-mergeを組み合わせて、Tailwindクラスの競合を解決します
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

