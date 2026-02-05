'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Calendar, BarChart3, Settings, MessageCircle } from 'lucide-react';

export interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const defaultNavItems: BottomNavItem[] = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/calendar', label: 'カレンダー', icon: Calendar },
  { href: '/report', label: 'レポート', icon: BarChart3 },
  { href: '/chat', label: '相談', icon: MessageCircle },
  { href: '/settings', label: '設定', icon: Settings },
];

export interface BottomNavProps {
  items?: BottomNavItem[];
  className?: string;
}

/**
 * モバイル用のボトムナビゲーション
 * デスクトップでは非表示（サイドバーを使用）
 */
export function BottomNav({ items = defaultNavItems, className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 w-full',
        'border-t border-slate-200 bg-white',
        'dark:border-slate-800 dark:bg-brand-950',
        'max-w-md mx-auto',
        // デスクトップでは非表示
        'lg:hidden',
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-8">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.href.replace('/', '') || 'home'}`}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2',
                'transition-colors',
                {
                  'text-brand-400 dark:text-brand-400': isActive,
                  'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50':
                    !isActive,
                }
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

