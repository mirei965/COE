'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useDayLog } from '@/hooks/useDayLog';
import { cn } from '@/lib/utils';
import { getLocalISOString } from '@/lib/date';
import { Sun } from 'lucide-react';

export function MorningCheckin() {
  const today = getLocalISOString();
  const { dayLog, upsertDayLog } = useDayLog(today);
  const [isOpen, setIsOpen] = useState(true);

  // Local state for form to avoid DB thrashing on every slide
  // Initialize with dayLog data when available
  const [formData, setFormData] = useState({
    sleepQuality: 3,
    morningArousal: 3,
    migraineProdrome: 0,
    isMenstruation: false,
    todayMode: 'normal' as 'normal' | 'eco' | 'rest',
    // Time defaults?
    sleepTime: '23:00',
    wakeTime: '07:00',
  });

  useEffect(() => {
    if (dayLog) {
      setFormData(prev => ({
        ...prev,
        sleepQuality: dayLog.sleepQuality ?? 3,
        morningArousal: dayLog.morningArousal ?? 3,
        migraineProdrome: dayLog.migraineProdrome ?? 0,
        isMenstruation: dayLog.isMenstruation ?? false,
        todayMode: dayLog.todayMode ?? 'normal',
        // Parse dates to time strings if available
        sleepTime: dayLog.sleepStart ? new Date(dayLog.sleepStart).toTimeString().slice(0, 5) : prev.sleepTime,
        wakeTime: dayLog.sleepEnd ? new Date(dayLog.sleepEnd).toTimeString().slice(0, 5) : prev.wakeTime,
      }));
      // If we have data, maybe collapse?
      if (dayLog.sleepQuality) setIsOpen(false);
    }
  }, [dayLog]);

  const handleSave = async () => {
    // Construct Dates
    const sleepDate = new Date(); // Yesterday? Logic needed.
    // Simplifying: sleepTime usually yesterday IF > wakeTime? Or just assume.
    // MVP: store as is.

    // Convert time strings to Date objects (approximate for today/yesterday)
    const wakeD = new Date(`${today}T${formData.wakeTime}`);
    const sleepD = new Date(`${today}T${formData.sleepTime}`);
    if (sleepD > wakeD) {
      // Sleep started yesterday
      sleepD.setDate(sleepD.getDate() - 1);
    }

    await upsertDayLog({
      id: today,
      sleepStart: sleepD,
      sleepEnd: wakeD,
      sleepQuality: formData.sleepQuality,
      morningArousal: formData.morningArousal,
      migraineProdrome: formData.migraineProdrome,
      isMenstruation: formData.isMenstruation,
      todayMode: formData.todayMode
    });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" onClick={() => setIsOpen(true)}>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5 text-brand-500" />
            <span>Morning Check-in</span>
          </CardTitle>
          <div className="text-sm text-slate-500">完了</div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-brand-100 dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sun className="h-6 w-6 text-brand-500" />
          Morning Check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sleep Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">就寝</label>
            <input
              type="time"
              className="w-full rounded-md border p-2 text-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
              value={formData.sleepTime}
              onChange={e => setFormData({ ...formData, sleepTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">起床</label>
            <input
              type="time"
              className="w-full rounded-md border p-2 text-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
              value={formData.wakeTime}
              onChange={e => setFormData({ ...formData, wakeTime: e.target.value })}
            />
          </div>
        </div>

        {/* Sliders / Ratings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>睡眠の質</span>
              <span className="font-bold">{formData.sleepQuality}</span>
            </div>
            <input
              type="range" min="1" max="5" step="1"
              className="w-full accent-brand-500"
              value={formData.sleepQuality}
              onChange={e => setFormData({ ...formData, sleepQuality: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>起床時過覚醒</span>
              <span className="font-bold">{formData.morningArousal}</span>
            </div>
            <input
              type="range" min="1" max="5" step="1"
              className="w-full accent-brand-500"
              value={formData.morningArousal}
              onChange={e => setFormData({ ...formData, morningArousal: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Prodrome & Menstruation */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-sm font-medium">頭痛予兆</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((level) => (
                <button
                  key={level}
                  onClick={() => setFormData({ ...formData, migraineProdrome: level })}
                  className={cn(
                    "h-8 w-8 rounded-full text-xs font-bold transition-all",
                    formData.migraineProdrome === level
                      ? "bg-brand-500 text-white scale-110"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}
                >
                  {level === 0 ? '-' : level}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <span className="text-sm font-medium">生理</span>
            <Switch
              checked={formData.isMenstruation}
              onChange={(e) => setFormData({ ...formData, isMenstruation: e.target.checked })}
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <span className="text-sm font-medium">今日のモード</span>
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'eco', 'rest'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFormData({ ...formData, todayMode: mode })}
                className={cn(
                  "rounded-lg py-2 text-sm font-medium capitalize border transition-all",
                  formData.todayMode === mode
                    ? "bg-brand-100 border-brand-500 text-brand-700 dark:bg-brand-900 dark:text-brand-300"
                    : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500"
                )}
              >
                {mode === 'normal' ? '通常' : mode === 'eco' ? '省エネ' : '養生'}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white" onClick={handleSave}>
          記録する
        </Button>
      </CardContent>
    </Card>
  );
}
