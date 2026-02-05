'use client';

import { db } from '@/db/db';
import { useRegimen } from '@/hooks/useRegimen';
import { useSetting } from '@/hooks/useSettings';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getLocalISOString } from '@/lib/date';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';

export function HomeHero() {
  const [isMounted, setIsMounted] = useState(false);
  const { value: userProfile } = useSetting<{ name: string }>('userProfile', { name: '' });
  const { activeRegimen, currentPhaseDay } = useRegimen();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const phaseName = activeRegimen?.type === 'tapering' ? '減薬期'
    : activeRegimen?.type === 'titration' ? '増薬・導入期'
      : '維持期';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'おはようございます🐓' : hour < 18 ? 'こんにちは☀️' : 'こんばんは🌙';

  // Upcoming Visits (Next 3)
  const todayStr = getLocalISOString();
  const upcomingVisits = useLiveQuery(async () => {
    try {
      // Fetch all and filter in JS to avoid potential IDBKeyRange errors
      const visits = await db.clinicVisits.toArray();

      // Need to join with clinics manually
      const clinics = await db.clinics.toArray();
      const clinicMap = new Map(clinics.map(c => [c.id, c.name]));

      return visits
        .filter(v => v.date >= todayStr && !v.isCompleted)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 2) // Top 2
        .map(v => ({
          ...v,
          clinicName: clinicMap.get(v.clinicId!) || '通院'
        }));
    } catch (e) {
      console.error('Failed to load visits', e);
      return [];
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="relative overflow-hidden p-6 rounded-3xl shadow-xl border border-white/40 dark:border-white/10 h-[200px] animate-pulse bg-slate-100 dark:bg-slate-800">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden p-6 rounded-3xl shadow-xl border border-white/40 dark:border-white/10 group">
      {/* Dynamic Glass Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-300/20 via-teal-300/20 to-teal-300/20 dark:from-indigo-900/40 dark:via-slate-900/60 dark:to-teal-900/40 backdrop-blur-2xl z-0" />

      {/* Top Highlight (Glossy effect) */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-teal-300/30 to-transparent pointer-events-none z-0" />

      {/* Bottom Glow */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <Link
        href="/guide"
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-cyan-300 transition-all bg-white/60 dark:bg-black/40 rounded-full backdrop-blur-md border border-white/20 dark:border-white/10 shadow-sm animate-gentle-pulse hover:animate-none"
      >
        <Lightbulb className="h-3.5 w-3.5 text-amber-500 fill-amber-500/10" />
        <span>使い方ガイド</span>
      </Link>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-col gap-1 pt-2 pb-2">
          <p className="text-sm font-medium text-slate-500 dark:text-brand-200/60 pl-0.5">
            {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
          <h2 className="text-lg text-slate-700 dark:text-slate-200 font-medium">
            {userProfile?.name ? (
              `${userProfile.name}さん、${greeting}`
            ) : (
              <Link href="/settings" className="underline decoration-slate-300 underline-offset-4 hover:text-brand-500 transition-colors">
                名前を設定してください
              </Link>
            )}
          </h2>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              {activeRegimen ? (
                <>
                  <span className="text-3xl font-bold text-slate-800 dark:text-brand-100 drop-shadow-sm">
                    {phaseName}
                  </span>
                  <span className="text-xl text-slate-600 dark:text-brand-200/80 font-medium">
                    {currentPhaseDay}日目
                  </span>
                </>
              ) : (
                <span className="text-xl text-slate-700 dark:text-slate-200">
                  状態設定なし
                </span>
              )}
            </div>
            {activeRegimen?.description && (
              <p className="text-sm font-bold text-slate-600 dark:text-brand-200/90 mt-0.5 opacity-90">
                {activeRegimen.description}
              </p>
            )}
          </div>
        </div>

        {/* Visit Card */}
        {upcomingVisits && upcomingVisits.length > 0 ? (
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/40 dark:bg-black/20 border border-white/40 dark:border-white/5 shadow-sm backdrop-blur-md transition-all hover:bg-white/50 dark:hover:bg-black/30">
            {upcomingVisits.map(visit => (
              <div key={visit.id} className="flex items-center gap-3">
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-500 text-white shadow-md shadow-indigo-500/20 shrink-0">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-0.5">次回の通院予定</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {visit.clinicName}
                    <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">
                      {new Date(visit.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })} {visit.time}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/5 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-3">
            <CalendarDays className="h-4 w-4 opacity-50" />
            <span>次回の予定は未登録です</span>
          </div>
        )}
      </div>
    </div>
  );
}
