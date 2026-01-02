import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

export interface HeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * アプリのヘッダーコンポーネント
 */
export function Header({ title, className, children }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-[60] w-full',
        'border-b border-slate-200 bg-white/80 backdrop-blur-sm',
        'dark:border-slate-800 dark:bg-brand-950/80',
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/head.png"
            alt="服薬体調管理ログ"
            width={40}
            height={40}
            className="h-8 w-8"
            priority
            unoptimized
          />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/report"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileText className="h-4 w-4" />
            <span>レポート作成</span>
          </Link>
          {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
      </div>
    </header>
  );
}

