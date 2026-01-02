import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * レスポンシブ対応のアプリケーションレイアウト
 * - モバイル: max-w-md (中央配置)
 * - タブレット: max-w-2xl
 * - デスクトップ: 全幅（サイドバーとメインコンテンツ）
 * Light: bg-slate-50, Dark: bg-brand-950 (Deep Navy)
 */
export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen w-full',
        // 'bg-slate-50 dark:bg-brand-950', // Removed to show global gradient
        // モバイル: 中央配置、最大幅md
        'max-w-md mx-auto',
        // タブレット: 最大幅2xl
        'md:max-w-2xl',
        // デスクトップ: 全幅（サイドバーはPageLayout内で管理）
        'lg:max-w-full lg:mx-0',
        className
      )}
    >
      {children}
    </div>
  );
}

