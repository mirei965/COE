'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { PageLayout } from '@/components/layout/PageLayout';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Zap, Pill, Activity, TrendingUp, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

export default function StatsPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  // 直近7日間
  const today = new Date();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const sevenDaysTimestamp = sevenDaysAgo.getTime();

  // Fetch EventLogs
  const eventLogs = useLiveQuery(async () => {
    return await db.eventLogs
      .where('timestamp')
      .above(sevenDaysTimestamp)
      .toArray();
  }, []);

  // Fetch DayLogs (Using bulkGet for known dates would be efficient, but useLiveQuery with range is fine or just all)
  // Since DayLogs ID is date string, we can verify.
  const dayLogs = useLiveQuery(async () => {
    return await db.dayLogs
      .where('id')
      .anyOf(dates)
      .toArray();
  }, []);

  // Merge Data
  const dailyStats = useMemo(() => {
    return dates.map(date => {
      const dayStr = new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      const dayLog = dayLogs?.find(l => l.id === date);
      const events = eventLogs?.filter(e => e.date === date) || [];

      const symptomLoad = events
        .filter(e => e.type === 'symptom')
        .reduce((sum, e) => sum + (e.severity || 1), 0);

      const medCount = events
        .filter(e => e.type === 'medicine')
        .length;

      return {
        date,
        dayStr,
        sleepQuality: dayLog?.sleepQuality || 0,
        morningArousal: dayLog?.morningArousal || 0,
        symptomLoad,
        medCount,
        events
      };
    });
  }, [dates, dayLogs, eventLogs]);

  // Calculate Metrics
  const totalSymptoms = useMemo(() => dailyStats.reduce((acc, d) => acc + d.symptomLoad, 0), [dailyStats]);
  const totalMeds = useMemo(() => dailyStats.reduce((acc, d) => acc + d.medCount, 0), [dailyStats]);

  // Ranking helper
  const symptomRanking = useMemo(() => {
    if (!eventLogs) return [];
    const counts = eventLogs.reduce((acc, log) => {
      if (log.type === 'symptom') {
        acc[log.name] = (acc[log.name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [eventLogs]);

  const summaryMessage = useMemo(() => {
    if (!eventLogs || eventLogs.length === 0) return "まだデータがありません。日々の記録をつけましょう。";
    const avgSleep = dayLogs && dayLogs.length > 0
      ? (dayLogs.reduce((a, b) => a + (b.sleepQuality || 0), 0) / dayLogs.length).toFixed(1)
      : null;

    if (avgSleep && Number(avgSleep) < 3) return "睡眠の質が少し低下気味のようです。無理せず休息を。";
    if (totalSymptoms === 0) return "素晴らしい！この1週間、症状の記録はありません。";
    return `過去7日間、あなたの体調スコアは安定しています。`;
  }, [eventLogs, dayLogs, totalSymptoms]);

  if (!isMounted) {
    return null;
  }

  return (
    <PageLayout
      title="統計サマリ"
      headerActions={<ThemeToggle />}
    >
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Main Insight */}
        <Card className="bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/30 dark:to-slate-900 border-teal-100 dark:border-teal-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-900 dark:text-teal-100">
              <Activity className="h-5 w-5" />
              Condition Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
              {summaryMessage}
            </p>
            <div className="mt-4 flex gap-4 text-sm text-slate-500">
              <div>
                <span className="block text-xs uppercase tracking-wider text-slate-400">睡眠平均</span>
                <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                  {dayLogs && dayLogs.length > 0 ? (dayLogs.reduce((a, b) => a + (b.sleepQuality || 0), 0) / dayLogs.length).toFixed(1) : '-'}
                </span>
                <span className="text-xs ml-1">/ 5</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-slate-400">症状負荷</span>
                <span className="text-xl font-bold text-slate-700 dark:text-slate-300">{totalSymptoms}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Weekly Condition Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-brand-400" />
                週間コンディション
              </CardTitle>
              <CardDescription>睡眠・症状・服薬の推移</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center text-sm">
                    <div className="w-16 text-slate-500 text-xs">{day.dayStr.split('/')[1]}/{day.dayStr.split('/')[2]}</div> {/* MM/DD (weekday part is tricky with locale, simplifying) */}

                    {/* Sleep Bar (Blue) */}
                    <div className="flex-1 flex gap-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mr-2">
                      <div
                        className="bg-blue-300 h-full rounded-full"
                        style={{ width: `${(day.sleepQuality / 5) * 100}%` }}
                        title={`睡眠: ${day.sleepQuality}`}
                      />
                    </div>

                    {/* Symptom Load (Red) */}
                    <div className="w-20 flex justify-center items-center gap-1">
                      {day.symptomLoad > 0 ? (
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(day.symptomLoad, 5) }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          ))}
                          {day.symptomLoad > 5 && <span className="text-[10px] text-red-400">+</span>}
                        </div>
                      ) : (
                        <span className="text-slate-200 text-xs">-</span>
                      )}
                    </div>

                    {/* Meds (Pill Icon or Count) */}
                    <div className="w-8 flex justify-end">
                      {day.medCount > 0 ? (
                        <div className="flex items-center text-blue-500 font-bold text-xs gap-0.5">
                          <Pill className="h-3 w-3" />
                          {day.medCount}
                        </div>
                      ) : (
                        <span className="text-slate-200 text-xs">-</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end gap-4 text-[10px] text-slate-400 mt-2">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-300 rounded-full"></span>睡眠</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full"></span>症状</div>
                  <div className="flex items-center gap-1"><Pill className="h-3 w-3 text-blue-500" />服薬</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Symptoms Ranking (Kept) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-red-400" />
                よく出る症状 (Top 5)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {symptomRanking.length > 0 ? (
                <div className="space-y-3">
                  {symptomRanking.map(([name, count], idx) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium dark:text-slate-200">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{ width: `${(count / (symptomRanking[0][1] || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{count}回</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-400">データがありません</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
