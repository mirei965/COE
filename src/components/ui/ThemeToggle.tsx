'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './Button';
import { cn } from '@/lib/utils';

/**
 * ダークモード/ライトモード切り替えボタン
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // マウント後にテーマを取得（SSR対応）
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // マウント前は何も表示しない（ハイドレーションエラー防止）
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-9 w-9 p-0',
          'text-slate-700 dark:text-slate-300',
          className
        )}
        aria-label="テーマを切り替え"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  // resolvedThemeまたはthemeを使用して現在の実際のテーマを取得
  const currentTheme = resolvedTheme || theme || 'light';
  const isDark = currentTheme === 'dark';

  const handleToggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={cn(
        'h-9 w-9 p-0',
        'text-slate-700 dark:text-slate-300',
        className
      )}
      aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

