'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useDayLog } from '@/hooks/useDayLog';
import { useEventLogs } from '@/hooks/useEventLogs';
import { Moon, Plus, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalISOString } from '@/lib/date';

export function NapQuickLog() {
  const today = getLocalISOString();
  const { dayLog, upsertDayLog } = useDayLog(today);
  const { addEventLog } = useEventLogs(today);
  const [showOptions, setShowOptions] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddNap = async (minutes: number) => {
    try {
      // 1. Add individual event log
      await addEventLog({
        type: 'nap',
        name: '昼寝',
        severity: minutes, // severityを「分」として利用
        note: `${minutes}分の昼寝`,
      });

      // 2. Update total nap duration in DayLog (summary for report/night review)
      const currentTotal = dayLog?.napDuration || 0;
      await upsertDayLog({
        id: today,
        napDuration: currentTotal + minutes,
      });

      setShowOptions(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to log nap:', error);
    }
  };

  const totalMinutes = dayLog?.napDuration || 0;
  const displayTotal = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}時間${totalMinutes % 60 > 0 ? (totalMinutes % 60) + '分' : ''}`
    : `${totalMinutes}分`;

  return (
    <Card id="step-nap" className="border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 overflow-hidden transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Quick Nap Log</p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {totalMinutes > 0 ? `今日の合計: ${displayTotal}` : '昼寝を記録する'}
              </h3>
            </div>
          </div>

          {!showOptions ? (
            <Button
              size="sm"
              className={cn(
                "rounded-full h-9 px-4 font-bold shadow-md transition-all active:scale-95",
                showSuccess ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white"
              )}
              onClick={() => setShowOptions(true)}
            >
              {showSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  追加
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
              {[15, 30, 60].map((mins) => (
                <Button
                  key={mins}
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-[10px] sm:text-xs font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                  onClick={() => handleAddNap(mins)}
                >
                  {mins}分
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-full text-slate-400"
                onClick={() => setShowOptions(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}
