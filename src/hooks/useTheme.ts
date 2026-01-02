'use client';

import * as React from 'react';

/**
 * テーマ管理用のカスタムフック
 * システム設定に依存せず、ユーザーの選択を優先
 */
export function useTheme() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = React.useState(false);

  // テーマを適用する関数
  const applyTheme = React.useCallback((newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    // 確実にクラスを適用/削除
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      // 確実に削除するため、一度すべて削除してから追加
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, []);

  // 初期化
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    // 保存されたテーマがあればそれを使用、なければライトモードをデフォルト
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, [applyTheme]);

  // テーマを切り替える関数
  const toggleTheme = React.useCallback(() => {
    setTheme((currentTheme) => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
      return newTheme;
    });
  }, [applyTheme]);

  // テーマを設定する関数
  const setThemeValue = React.useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  return {
    theme,
    mounted,
    toggleTheme,
    setTheme: setThemeValue,
  };
}

