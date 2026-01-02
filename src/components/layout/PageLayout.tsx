import * as React from 'react';
import { AppLayout } from './AppLayout';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

export interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
}

/**
 * ページ全体のレイアウトコンポーネント
 * - モバイル: ヘッダー + コンテンツ + ボトムナビ
 * - デスクトップ: サイドバー + ヘッダー + コンテンツ
 */
import { InstallPrompt } from './InstallPrompt';
import { TermsOfService } from '@/components/features/TermsOfService';

export function PageLayout({
  title,
  children,
  headerActions,
  className,
}: PageLayoutProps) {
  return (
    <AppLayout className={className}>
      <TermsOfService />
      <div className="flex flex-col min-h-screen">
        <InstallPrompt />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 h-full">
            <Header title={title}>{headerActions}</Header>
            <main
              className={cn(
                'pb-20 pt-8 px-4',
                'lg:pb-6 lg:pt-8 lg:px-6',
                'lg:max-w-6xl lg:mx-auto w-full'
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
      <BottomNav />
    </AppLayout>
  );
}

