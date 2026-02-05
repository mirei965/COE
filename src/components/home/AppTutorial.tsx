'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { X, ChevronRight, ChevronLeft, Sparkles, Sun, Moon, Zap, BarChart3 } from 'lucide-react';

interface TutorialStep {
  title: string;
  description: string;
  targetId: string;
  icon: React.ReactNode;
}

const steps: TutorialStep[] = [
  {
    title: "Coe™ へようこそ",
    description: "日々の体調を簡単に、そして正確に記録するための新しいパートナーです。このアプリの使い方を簡単にご紹介します。",
    targetId: "intro-hero",
    icon: <Sparkles className="h-6 w-6 text-indigo-400" />
  },
  {
    title: "朝のチェックイン",
    description: "毎朝、目覚めた時の睡眠の状態や気分を記録しましょう。睡眠時間は自動で計算されます。",
    targetId: "step-morning",
    icon: <Sun className="h-6 w-6 text-orange-400" />
  },
  {
    title: "昼寝の記録",
    description: "新機能！日中のちょっとした休息も記録できるようになりました。複数回の昼寝も合計されてレポートに反映されます。",
    targetId: "step-nap",
    icon: <Moon className="h-6 w-6 text-indigo-500" />
  },
  {
    title: "瞬時のクイックログ",
    description: "「あ、今頭痛がする」「薬を飲んだ」そんな時はスタンプをタップするだけ。強弱も直感的に記録できます。",
    targetId: "step-stamps",
    icon: <Zap className="h-6 w-6 text-amber-400" />
  },
  {
    title: "夜の振り返り",
    description: "1日の終わりに少しだけ日記を書いてみてください。AIがあなたの記録を解析し、温かいフィードバックを生成します。",
    targetId: "step-night-collapsed",
    icon: <Sparkles className="h-6 w-6 text-indigo-400" />
  },
  {
    title: "医師用レポート",
    description: "ここから、蓄積されたデータを美しいレポートとして表示できます。診察時に医師に見せることで、より的確な相談が可能になります。",
    targetId: "nav-report",
    icon: <BarChart3 className="h-6 w-6 text-emerald-500" />
  }
];

export function AppTutorial() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorialV2');
    if (!hasSeenTutorial) {
      // Delay slightly to ensure elements are rendered
      const timer = setTimeout(() => setCurrentStep(0), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isMounted || currentStep === null) return null;

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Scroll to target
      const el = document.getElementById(steps[currentStep + 1].targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      const el = document.getElementById(steps[currentStep - 1].targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenTutorialV2', 'true');
    setCurrentStep(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border border-white/20 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl">
            {step.icon}
          </div>
          <button onClick={handleComplete} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{step.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentStep ? "w-6 bg-indigo-500" : "w-1.5 bg-slate-200 dark:bg-slate-700"
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="gap-1 text-xs px-2">
                <ChevronLeft className="h-3 w-3" /> 前へ
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="bg-indigo-500 hover:bg-indigo-600 text-white gap-1 text-xs px-4 rounded-full font-bold">
              {currentStep === steps.length - 1 ? "始める" : "次へ"} <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
