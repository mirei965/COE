'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Calendar, BarChart3, Settings, MessageCircle } from 'lucide-react';

export interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const defaultNavItems: SidebarItem[] = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/calendar', label: 'カレンダー', icon: Calendar },
  { href: '/stats', label: '統計', icon: BarChart3 },
  { href: '/chat', label: 'AIチャット', icon: MessageCircle },
  { href: '/settings', label: '設定', icon: Settings },
];

export interface SidebarProps {
  items?: SidebarItem[];
  className?: string;
}

/**
 * デスクトップ用のサイドバーナビゲーション
 * モバイルでは非表示
 */
export function Sidebar({ items = defaultNavItems, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col',
        'sticky top-0 h-screen z-[80]', // Changed from fixed to sticky
        'w-64 border-r border-slate-200 bg-white',
        'dark:border-slate-800 dark:bg-slate-900',
        'pt-4', // Reduced padding since it's no longer behind the header by default
        className
      )}
    >
      <nav className="flex flex-col p-4 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg',
                'transition-colors',
                {
                  'bg-brand-400/10 text-brand-400 dark:bg-brand-400/20 dark:text-brand-400':
                    isActive,
                  'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800':
                    !isActive,
                }
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

