import * as React from 'react';
import { cn } from '@/lib/utils';

export interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * モバイル幅の制御と背景色を管理するレイアウトコンポーネント
 * Light: bg-slate-50, Dark: bg-brand-950 (Deep Navy)
 */
export function MobileLayout({ children, className }: MobileLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen w-full',
        'bg-slate-50 dark:bg-brand-950',
        'max-w-md mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

