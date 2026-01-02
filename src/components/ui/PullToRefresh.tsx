'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: React.ReactNode;
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const [startPoint, setStartPoint] = useState(0);
  const [pullChange, setPullChange] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshThreshold = 80; // リフレッシュが発動するピクセル数

  // スクロール位置がトップにあるか確認（バウンス等を考慮して少し余裕を持たせる）
  const isTop = () => window.scrollY <= 5;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTop()) {
      setStartPoint(e.touches[0].screenY);
    } else {
      setStartPoint(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startPoint || isRefreshing) return;

    const currentY = e.touches[0].screenY;
    const diff = currentY - startPoint;

    // 下方向へのプルかつ、トップにいる場合のみ
    if (diff > 0 && isTop()) {
      // 抵抗感のあるプル動作（対数的に変化量を減らす）
      const resistance = diff * 0.45;
      setPullChange(Math.min(resistance, 150)); // 最大150pxまで

      // ブラウザ標準のスクロール等を防ぐ必要がある場合は e.preventDefault() だが、
      // ReactのSyntheticEventではpassiveリスナー問題があるため難しい。
      // globals.cssの overscroll-behavior-y: none が効いていればOK。
    }
  };

  const handleTouchEnd = () => {
    if (!startPoint || isRefreshing) return;

    if (pullChange > refreshThreshold) {
      setIsRefreshing(true);
      setPullChange(60); // ローディング位置に固定

      // 実際にリロードを実行
      // UX向上のため、少しだけ待ってからリロード（アニメーションを見せる）
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      // キャンセル：元に戻す
      setPullChange(0);
      setStartPoint(0);
    }
  };

  // リフレッシュ中の視覚効果
  const rotationStyle = {
    transform: `rotate(${pullChange * 3}deg)`,
  };

  return (
    <div
      ref={containerRef}
      className="min-h-full transition-transform ease-out duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${pullChange}px)`,
        // リリース時の戻りを滑らかに、ドラッグ中は即座に追従
        transition: startPoint > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      {/* Loading Indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 w-full flex items-center justify-center pointer-events-none -translate-y-full pb-4",
          isRefreshing ? "opacity-100" : "opacity-70"
        )}
        style={{ height: pullChange > 0 ? 80 : 0 }}
      >
        <div className={cn(
          "bg-slate-900/80 dark:bg-white/20 text-white rounded-full p-2.5 shadow-lg backdrop-blur-sm transition-all",
          pullChange > 0 ? "scale-100 mt-2" : "scale-0"
        )}>
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw
              className={cn("h-5 w-5 transition-transform", pullChange > refreshThreshold && "text-brand-300")}
              style={rotationStyle}
            />
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
