'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Button } from '@/components/ui/Button';
import { Printer, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRegimen } from '@/hooks/useRegimen';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { getLocalISOString, getPastDate } from '@/lib/date';

// Fix for Recharts type errors in Next.js/TypeScript
const ResponsiveContainerAny = ResponsiveContainer as any;
const LineChartAny = LineChart as any;
const XAxisAny = XAxis as any;
const YAxisAny = YAxis as any;
const CartesianGridAny = CartesianGrid as any;
const TooltipAny = Tooltip as any;
const LineAny = Line as any;

import { Suspense } from 'react';

// Separate the content to use useSearchParams inside Suspense
function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [clinics, setClinics] = useState<{ id: number, name: string }[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [dateStr, setDateStr] = useState('');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Period State (Default: Last 14 days)
  const today = new Date();
  const [startDateStr, setStartDateStr] = useState(() => getPastDate(14));
  const [endDateStr, setEndDateStr] = useState(() => getLocalISOString());

  // Hooks
  const { activeRegimen } = useRegimen();

  useEffect(() => {
    setDateStr(today.toLocaleDateString('ja-JP'));

    // Load clinics
    db.clinics.toArray().then(items => {
      setClinics(items.map(c => ({ id: c.id!, name: c.name })));
    });
  }, []);

  // Update period when clinic changes
  useEffect(() => {
    if (selectedClinicId) {
      db.clinicVisits.where('clinicId').equals(selectedClinicId).toArray().then(visits => {
        const completed = visits.filter(v => v.isCompleted).sort((a, b) => b.date.localeCompare(a.date));

        // Find the last completed visit
        const lastVisit = completed[0];

        if (lastVisit) {
          // Start from the day of last visit
          setStartDateStr(lastVisit.date);
          setEndDateStr(today.toISOString().split('T')[0]); // Till today
        } else {
          // No history, default to 14 days
          const d = new Date();
          d.setDate(d.getDate() - 14);
          setStartDateStr(d.toISOString().split('T')[0]);
          setEndDateStr(today.toISOString().split('T')[0]);
        }
      });
    }
  }, [selectedClinicId]);

  const periodDays = Math.max(1, Math.ceil((new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // データ取得
  const dayLogs = useLiveQuery(async () => {
    return await db.dayLogs
      .where('id')
      .between(startDateStr, endDateStr, true, true)
      .toArray();
  }, [startDateStr, endDateStr]);

  const eventLogs = useLiveQuery(async () => {
    const startTs = new Date(startDateStr).getTime();
    const endTs = new Date(endDateStr).getTime() + 86400000;
    return await db.eventLogs
      .where('timestamp')
      .between(startTs, endTs)
      .toArray();
  }, [startDateStr, endDateStr]);

  const regimenLogs = useLiveQuery(async () => {
    return await db.regimenHistory
      .where('startDate')
      .between(startDateStr, endDateStr, true, true)
      .toArray();
  }, [startDateStr, endDateStr]);

  // データ加工 for Graph and Summary
  const graphData = dayLogs?.map(log => {
    const date = log.id; // YYYY-MM-DD
    const startOfDay = new Date(date).getTime();
    const endOfDay = startOfDay + 86400000;

    const dailySymptoms = eventLogs?.filter(e =>
      e.type === 'symptom' && e.timestamp >= startOfDay && e.timestamp < endOfDay
    ).length || 0;

    return {
      date: log.id.slice(5), // MM-DD
      symptomCount: dailySymptoms,
      sleep: log.sleepQuality || 0,
    };
  });

  // Medicine Check
  const symptomCounts: Record<string, number> = {};
  const medCounts: Record<string, number> = {};

  eventLogs?.forEach(e => {
    if (e.type === 'symptom') symptomCounts[e.name] = (symptomCounts[e.name] || 0) + 1;
    if (e.type === 'medicine') medCounts[e.name] = (medCounts[e.name] || 0) + 1;
  });

  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 統計データ計算
  const validSleepLogs = dayLogs?.filter(l => l.sleepStart && l.sleepEnd) || [];
  const sleepDurations = validSleepLogs.map(log => {
    const start = new Date(log.sleepStart!).getTime();
    const end = new Date(log.sleepEnd!).getTime();
    return (end - start) / (1000 * 60); // minutes
  });

  const avgSleepMin = sleepDurations.length ? sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length : 0;
  const minSleepMin = sleepDurations.length ? Math.min(...sleepDurations) : 0;
  const maxSleepMin = sleepDurations.length ? Math.max(...sleepDurations) : 0;

  const fmtTime = (m: number) => `${Math.floor(m / 60)}時間${Math.round(m % 60)}分`;

  const avgSleepQuality = dayLogs?.length ? (dayLogs.reduce((a, b) => a + (b.sleepQuality || 0), 0) / dayLogs.length).toFixed(1) : '-';
  const avgArousal = dayLogs?.length ? (dayLogs.reduce((a, b) => a + (b.morningArousal || 0), 0) / dayLogs.length).toFixed(1) : '-';

  const symptoms = eventLogs?.filter(e => e.type === 'symptom') || [];
  const avgSymptomSeverity = symptoms.length ? (symptoms.reduce((a, b) => a + (b.severity || 0), 0) / symptoms.length).toFixed(1) : '-';

  const napLogs = dayLogs?.filter(l => l.napDuration && l.napDuration > 0) || [];
  const avgNapMin = napLogs.length ? napLogs.reduce((a, b) => a + (b.napDuration || 0), 0) / dayLogs!.length : 0;


  const generateDoctorReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDateStr,
          endDate: endDateStr,
          phaseInfo: activeRegimen?.description,
          dayLogs: dayLogs?.map(l => ({
            date: l.id,
            dayOverall: l.dayOverall,
            sleepQuality: l.sleepQuality,
            napDuration: l.napDuration,
            migraineProdrome: l.migraineProdrome,
            fatigueLevel: l.fatigueLevel,
            note: l.note,
            echoSummary: l.echoSummary
          })) || [],
          symptoms: topSymptoms.map(([name, count]) => ({ name, count })),
          medications: Object.entries(medCounts).map(([name, count]) => ({ name, count }))
        }),
      });

      if (!response.ok) throw new Error('Report generation failed');
      const data = await response.json();
      setAiReport(data.report);
    } catch (error) {
      console.error(error);
      alert('レポート生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:bg-slate-50 dark:bg-slate-900/5 transition-colors print:bg-white print:min-h-0">
      {/* Global Print Styles to force 1 page and fix margins */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 5mm !important;
          }
          body, .dark body, html, .dark html {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            background-image: none !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Force hide the header and all print:hidden elements */
          .print\:hidden {
            display: none !important;
          }
          /* Ensure no extra pages from ghost elements */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Fix sticky positioned elements causing black bands in print */
          .sticky {
            position: static !important;
          }
          .no-break {
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Print Control Bar (Screen only) */}
      <div className="print:hidden sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md w-full">
        <div className="max-w-[210mm] mx-auto w-full px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white hover:bg-slate-800 px-2" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <span className="font-bold text-sm md:text-lg">診療用レポート</span>
              {clinics.length > 0 && (
                <select
                  className="text-xs bg-slate-800 border border-slate-700 rounded text-slate-300 p-1 mt-1 outline-none focus:border-indigo-500"
                  value={selectedClinicId || ''}
                  onChange={(e) => setSelectedClinicId(Number(e.target.value) || null)}
                >
                  <option value="">-- 病院を選択 (標準14日) --</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <Button onClick={() => window.print()} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-lg">
            <Printer className="mr-0 md:mr-2 h-4 w-4" />
            <span className="hidden md:inline">印刷 / PDF保存</span>
          </Button>
        </div>
      </div>
      <div className='max-w-4xl mx-auto md:mt-5 print:m-0 print:p-0 print:w-full'>
        {/* Report Content (A4 Style) */}
        <div className="p-4 md:p-8 print:p-0 print:w-full">
          <div className="max-w-[210mm] mx-auto bg-white duration-300 p-4 md:p-10 print:p-[5mm] space-y-4 print:space-y-2 print:w-full print:max-w-none h-auto text-slate-900 shadow-2xl print:shadow-none border border-slate-200 print:border-0 print:break-inside-avoid">
            {/* Header */}
            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 print:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-slate-900 print:text-black">体調ログレポート</h1>
                <p className="text-sm text-slate-700 mt-0.5 print:text-black font-medium">
                  期間: {startDateStr} 〜 {endDateStr}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600 print:text-black">作成日: {dateStr}</p>
              </div>
            </div>
            {/* 1. Vital Graph */}
            <div className="space-y-3 print:space-y-1 break-inside-avoid">
              <h2 className="text-base font-bold border-l-4 border-indigo-600 pl-2 text-slate-900 print:text-black">睡眠・症状数の推移</h2>
              <div className="h-48 print:h-36 border border-slate-300 rounded-lg bg-white print:bg-white print:border-slate-300 overflow-hidden">
                {graphData && graphData.length > 0 ? (
                  <ResponsiveContainerAny width="100%" height="100%">
                    <LineChartAny data={graphData} margin={{ top: 15, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGridAny strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.3} />
                      <XAxisAny dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <YAxisAny yAxisId="left" domain={[0, 5]} hide />
                      <YAxisAny yAxisId="right" domain={[0, 'auto']} hide />
                      <TooltipAny
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b' }}
                      />
                      <LineAny yAxisId="left" type="monotone" dataKey="sleep" stroke="#0284c7" strokeWidth={2} name="睡眠の質" dot={{ r: 2, fill: '#0284c7' }} />
                      <LineAny yAxisId="right" type="monotone" dataKey="symptomCount" stroke="#e11d48" strokeWidth={2} name="症状数" dot={{ r: 2, fill: '#e11d48' }} />
                    </LineChartAny>
                  </ResponsiveContainerAny>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">データなし</div>
                )}
                <div className="flex justify-center gap-4 mt-1 text-[10px] text-slate-700 print:text-slate-600">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-sky-600 rounded-full"></span> 睡眠の質</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span> 症状数</span>
                </div>
              </div>
            </div>

            {/*Condition Summary*/}
            <div className="mt-5 print:mt-2 space-y-3 print:space-y-1 break-inside-avoid">
              <h2 className="text-base font-bold border-l-4 border-amber-500 pl-2 text-slate-800 print:text-slate-900">平均コンディション記録</h2>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 print:p-2 print:bg-slate-50 print:border-slate-300">
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-200">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-bold print:text-slate-700">睡眠時間 (平均)</p>
                    <p className="text-lg font-bold text-slate-800">{fmtTime(avgSleepMin)}</p>
                    <p className="text-[10px] text-slate-400 print:hidden">
                      範囲: {fmtTime(minSleepMin)} 〜 {fmtTime(maxSleepMin)}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-100 print:mt-1 print:pt-1 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-slate-500 print:text-slate-700">平均睡眠の質</p>
                        <p className="text-sm font-bold text-slate-800">★{avgSleepQuality}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 print:text-slate-700">昼寝 (平均)</p>
                        <p className="text-sm font-bold text-slate-800">
                          {avgNapMin > 0 ? `${Math.round(avgNapMin)}分` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 flex flex-col justify-center">
                    <p className="text-xs text-slate-500 font-bold print:text-slate-700">平均覚醒度</p>
                    <p className="text-2xl font-bold text-amber-500">{avgArousal}<span className="text-sm text-slate-300"> / 5</span></p>
                  </div>
                  <div className="space-y-1 flex flex-col justify-center">
                    <p className="text-xs text-slate-500 font-bold print:text-slate-700">平均症状強度</p>
                    <p className="text-2xl font-bold text-rose-500">{avgSymptomSeverity}<span className="text-sm text-slate-300"> / 3</span></p>
                    <p className="text-[10px] text-slate-400 print:text-slate-600">記録された症状の平均</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 break-inside-avoid mt-2 border-t border-slate-100 pt-4 print:pt-2 print:gap-2">
              {/* 2. Medication */}
              <div className="space-y-2 print:space-y-1">
                <div className="flex justify-between items-baseline mb-1 border-l-4 border-emerald-600 pl-2">
                  <h2 className="text-base font-bold text-slate-800 print:text-slate-900">服薬・減薬状況</h2>
                </div>

                {regimenLogs && regimenLogs.length > 0 && (
                  <div className="mb-2 p-2 bg-emerald-50 rounded border border-emerald-100 text-xs text-slate-700 print:text-slate-800 print:border-emerald-200 print:mb-1">
                    <p className="font-bold text-emerald-700 mb-1 print:text-emerald-700">期間中の変更:</p>
                    <ul className="space-y-1">
                      {regimenLogs.map(r => (
                        <li key={r.id}>
                          <span className="font-mono mr-2 opacity-70">{r.startDate.slice(5)}</span>
                          <span className="font-bold mr-1">[{r.type === 'tapering' ? '減薬' : r.type === 'titration' ? '増薬' : '維持'}]</span>
                          {r.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 print:bg-white print:border-slate-300">
                  {Object.keys(medCounts).length > 0 ? (
                    <ul className="space-y-1 text-xs text-slate-800 print:text-slate-800">
                      {Object.entries(medCounts).map(([name, count]) => (
                        <li key={name} className="flex justify-between items-center border-b border-slate-100 pb-1 last:border-0 print:border-slate-300">
                          <span>{name}</span>
                          <div className="flex items-end gap-1">
                            <span className="font-bold">{count}回</span>
                            <span className="text-[10px] text-slate-400 scale-90 origin-right whitespace-nowrap print:text-slate-600">
                              (Avg {(count / periodDays).toFixed(1)}/日)
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 text-xs py-2 text-center">記録なし</p>
                  )}
                </div>
              </div>

              {/* 3. Symptoms */}
              <div className="space-y-2 print:space-y-1">
                <h2 className="text-base font-bold border-l-4 border-rose-500 pl-2 text-slate-800 print:text-slate-900">主な症状</h2>
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 print:bg-white print:border-slate-300">
                  {topSymptoms.length > 0 ? (
                    <ul className="space-y-1 text-xs text-slate-800 print:text-slate-800">
                      {topSymptoms.map(([name, count], i) => (
                        <li key={name} className="flex justify-between items-center border-b border-slate-100 pb-1 last:border-0 print:border-slate-300">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 flex items-center justify-center bg-white rounded-full text-[10px] font-bold text-slate-600 border border-slate-200 print:bg-white print:text-slate-600 print:border-slate-300">{i + 1}</span>
                            {name}
                          </span>
                          <span className="font-bold">{count}回</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 text-xs py-2 text-center">記録なし</p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. AI Report Summary */}
            <div className="space-y-2 mt-3 print:mt-1 break-inside-avoid">
              <div className="flex items-center justify-between border-l-4 border-indigo-500 pl-2">
                <h2 className="text-base font-bold text-slate-800 print:text-slate-900">AIサマリー</h2>
                {!isGenerating && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateDoctorReport}
                    className="h-7 text-xs print:hidden border-indigo-200 hover:bg-indigo-50 text-indigo-600"
                  >
                    {aiReport ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        再生成
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        生成する
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg p-4 print:p-2 bg-slate-50 text-xs text-slate-800 print:bg-white print:border-slate-300 min-h-[150px] print:min-h-0">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>医師への報告内容をまとめています...</span>
                  </div>
                ) : aiReport ? (
                  <div className="prose prose-sm prose-slate max-w-none prose-headings:text-sm prose-headings:font-bold prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiReport}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-6 italic">
                    ボタンを押すと、期間内の記録から医師向けの要約レポートを作成します。
                  </div>
                )}
              </div>
            </div>

            {/* Footer Area for Doctor Notes */}
            <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-300 break-inside-avoid print:border-slate-300">
              <h3 className="text-xs font-bold text-slate-700 mb-2 print:text-black uppercase">医師メモ欄</h3>
              <div className="h-24 rounded-lg border border-slate-200 bg-slate-50/50 print:bg-slate-50/50 print:border-slate-200"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
