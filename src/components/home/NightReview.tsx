'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useDayLog, useDayLogs } from '@/hooks/useDayLog';
import { useEventLogs } from '@/hooks/useEventLogs';
import { useRegimen } from '@/hooks/useRegimen';
import { Moon, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export function NightReview() {
  const today = new Date().toISOString().split('T')[0];
  const { dayLog, upsertDayLog } = useDayLog(today);

  // Fetch recent history for AI context (past 7 days)
  const todayObj = new Date();
  const pastObj = new Date(todayObj);
  pastObj.setDate(todayObj.getDate() - 7);
  const startDate = pastObj.toISOString().split('T')[0];
  const { dayLogs: recentLogs } = useDayLogs(startDate, today);

  const { eventLogs } = useEventLogs(today);
  const { currentPhaseDay, activeRegimen } = useRegimen();
  const [isOpen, setIsOpen] = useState(false);

  // Local state
  const [formData, setFormData] = useState({
    dayOverall: 'fair' as 'good' | 'fair' | 'bad',
    dinnerAmount: 'medium' as 'light' | 'medium' | 'heavy',
    note: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (dayLog) {
      setFormData({
        dayOverall: dayLog.dayOverall ?? 'fair',
        dinnerAmount: dayLog.dinnerAmount ?? 'medium',
        note: dayLog.note ?? '',
      });
    }
  }, [dayLog]);

  // AI Generation Logic
  const generateEchoWithAI = async () => {
    setIsGenerating(true);
    try {
      const phaseText = activeRegimen ? `減薬Day${currentPhaseDay}` : '維持期';

      const response = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          dayOverall: formData.dayOverall,
          dinnerAmount: formData.dinnerAmount,
          note: formData.note,
          eventLogs: eventLogs.map(e => ({ type: e.type, name: e.name })),
          phaseInfo: phaseText,
          recentLogs: recentLogs.map(log => ({
            date: log.id,
            dayOverall: log.dayOverall,
            note: log.note
          })).filter(l => l.date !== today) // Exclude today from history since it's sent separately
        }),
      });

      if (!response.ok) throw new Error('Generation failed');
      const data = await response.json();

      // Update local state or directly save? Let's just update local state first if we had one for summary, 
      // but here we are upserting directly. 
      // Actually, typically we want to show it before saving. But current UI saves immediately on "Save & Exit".
      // Let's modify behavior: Generate -> Fill Preview -> Save manually.
      // But preserving existing flow:

      return data.echo;

    } catch (error) {
      console.error(error);
      return "AI生成に失敗しました。手動で記録してください。";
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    // If echo is not already generated/confirmed by user, generate it now (or use what we have)
    // For now, let's generate it on the fly if user hasn't seen it, OR strictly rely on the button.
    // User request implies "Review is Gemini", so let's allow "Auto-generate on save" if empty?
    // Or better, add a specific "Generate" button in UI.

    // Let's assume we generate it here for simplicity if it's a new entry.
    // But waiting for API is slow. Let's add a button in the UI instead.

    // Reverting to: Save whatever is in dayLog or generate a simple fallback if needed?
    // Actually, user wants Gemini to do it. 
    // Let's trigger generation and THEN save.

    let summary = dayLog?.echoSummary;
    if (!summary) {
      summary = await generateEchoWithAI();
    }

    await upsertDayLog({
      id: today,
      dayOverall: formData.dayOverall,
      dinnerAmount: formData.dinnerAmount,
      note: formData.note,
      echoSummary: summary
    });
    setIsOpen(false);
  };

  const summaryPreview = dayLog?.echoSummary;

  if (!isOpen && !dayLog?.dayOverall) {
    return (
      <Card className="cursor-pointer border-brand-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50" onClick={() => setIsOpen(true)}>
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="h-5 w-5 text-indigo-400" />
            <span>Night Review</span>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // If closed but has data, show summary card
  if (!isOpen && dayLog?.dayOverall) {
    return (
      <Card className="border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10">
        <CardHeader className="py-4 pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span>Echo Summary</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>修正</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400">
            <ReactMarkdown>{dayLog.echoSummary || ''}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-brand-100 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Moon className="h-6 w-6 text-indigo-400" />
          Night Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall & Dinner */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">1日の総合</label>
            <div className="flex gap-1">
              {(['good', 'fair', 'bad'] as const).map(opt => (
                <button key={opt}
                  onClick={() => setFormData({ ...formData, dayOverall: opt })}
                  className={cn(
                    "flex-1 py-2 rounded text-sm font-medium capitalize border transition-all",
                    formData.dayOverall === opt
                      ? opt === 'good' ? "bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700" :
                        opt === 'bad' ? "bg-red-100 text-red-700 border-red-400 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" :
                          "bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500"
                      : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  {opt === 'good' ? '良い' : opt === 'fair' ? '普通' : '悪い'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">夕食の量</label>
            <div className="flex gap-1">
              {(['light', 'medium', 'heavy'] as const).map(opt => (
                <button key={opt}
                  onClick={() => setFormData({ ...formData, dinnerAmount: opt })}
                  className={cn(
                    "flex-1 py-2 rounded text-sm font-medium capitalize border transition-all",
                    formData.dinnerAmount === opt
                      ? "bg-brand-100 text-brand-700 border-brand-400 dark:bg-brand-900/40 dark:text-brand-300 dark:border-brand-700"
                      : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  {opt === 'light' ? '少なめ' : opt === 'medium' ? '普通' : '多め'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">フリーメモ</label>
          <Textarea
            placeholder="今日の日記..."
            value={formData.note}
            onChange={e => setFormData({ ...formData, note: e.target.value })}
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
              <Sparkles className="h-3 w-3" /> Echo (AI Summary)
            </div>
            {!summaryPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const text = await generateEchoWithAI();
                  // Save immediately to preview it? Or just store in temp state? 
                  // To keep it simple with pure upsert model:
                  await upsertDayLog({
                    id: today,
                    dayOverall: formData.dayOverall,
                    dinnerAmount: formData.dinnerAmount,
                    note: formData.note,
                    echoSummary: text
                  });
                }}
                disabled={isGenerating}
                className="h-6 text-xs text-indigo-500 hover:text-indigo-600"
              >
                {isGenerating ? '生成中...' : 'AIで生成する'}
              </Button>
            )}
          </div>
          <div className={cn("text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400", !summaryPreview && "text-slate-400 italic")}>
            {isGenerating ? (
              "AIが今日の記録をまとめています..."
            ) : summaryPreview ? (
              <ReactMarkdown>{summaryPreview}</ReactMarkdown>
            ) : (
              "まだ生成されていません"
            )}
          </div>
        </div>

        <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white" onClick={() => setIsOpen(false)}>
          閉じる
        </Button>
      </CardContent>
    </Card>
  );
}
