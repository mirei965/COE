'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Switch } from '@/components/ui/Switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, Trash2, Edit2, Clock, Check, X, MapPin, Calendar as CalendarIcon, CheckCircle2, Circle, Plus, Pill, Zap, Sun } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EventLog } from '@/db/db';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Moon, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function CalendarPage() {
  // Normalize a date to local midnight (00:00:00.000)
  const getStartOfDay = (d: Date) => {
    const newD = new Date(d);
    newD.setHours(0, 0, 0, 0);
    return newD;
  };

  const [currentDate, setCurrentDate] = useState(() => getStartOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => getStartOfDay(new Date()));
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string, time: string }>({ name: '', time: '' });

  // カレンダー計算
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 月初めの曜日オフセット
    const startOffset = firstDay.getDay();
    // 月末の予備
    const daysInMonth = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // 前月分
    // 前月分: 0からstartOffset-1まで逆順で埋める
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    // 当月分
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // 翌月分 (6週間分埋める)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [currentDate]);

  // Helper for 'YYYY-MM-DD' in local time
  const toLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // 選択した日のログ取得
  const selectedDateStr = useMemo(() => toLocalDateStr(selectedDate), [selectedDate]);

  // Use correctly normalized timestamp range based on local time
  const startTs = selectedDate.getTime();
  const endTs = startTs + 86400000;

  const logs = useLiveQuery(async () => {
    const events = await db.eventLogs
      .where('date')
      .equals(selectedDateStr)
      .toArray();
    // Sort manually to ensure newest first by timestamp within the date
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedDateStr]);

  const selectedDayLog = useLiveQuery(async () => {
    return await db.dayLogs.get(selectedDateStr);
  }, [selectedDateStr]);

  // Medicines for selection
  const medicines = useLiveQuery(() => db.medicines.toArray());

  // Clinic Data Fetching
  const clinics = useLiveQuery(() => db.clinics.toArray());

  // 範囲内のDayLogsを取得
  const startDay = toLocalDateStr(calendarDays[0].date);
  const endDay = toLocalDateStr(calendarDays[calendarDays.length - 1].date);

  const monthlyDayLogs = useLiveQuery(async () => {
    return await db.dayLogs
      .where('id')
      .between(startDay, endDay, true, true)
      .toArray();
  }, [startDay, endDay]);

  // Fetch all event logs for the month to show indicators in the grid
  const monthlyEventLogs = useLiveQuery(async () => {
    return await db.eventLogs
      .where('date')
      .between(startDay, endDay, true, true)
      .toArray();
  }, [startDay, endDay]);

  const monthlyVisits = useLiveQuery(async () => {
    return await db.clinicVisits
      .where('date')
      .between(startDay, endDay, true, true)
      .toArray();
  }, [startDay, endDay]);

  const selectedDayVisit = useLiveQuery(async () => {
    return await db.clinicVisits.where('date').equals(selectedDateStr).first();
  }, [selectedDateStr]);

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleDeleteClick = (id: number) => {
    setDeleteTargetId(id);
  };

  const executeDelete = async () => {
    if (deleteTargetId) {
      await db.eventLogs.delete(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  // Night Review State
  const [showNightReviewModal, setShowNightReviewModal] = useState(false);
  const [nightReviewForm, setNightReviewForm] = useState({
    dayOverall: 'fair' as 'good' | 'fair' | 'bad',
    dinnerAmount: 'medium' as 'light' | 'medium' | 'heavy',
    note: '',
    echoSummary: '',
  });

  const openNightReviewModal = () => {
    if (selectedDayLog) {
      setNightReviewForm({
        dayOverall: selectedDayLog.dayOverall ?? 'fair',
        dinnerAmount: selectedDayLog.dinnerAmount ?? 'medium',
        note: selectedDayLog.note ?? '',
        echoSummary: selectedDayLog.echoSummary ?? '',
      });
    } else {
      setNightReviewForm({
        dayOverall: 'fair',
        dinnerAmount: 'medium',
        note: '',
        echoSummary: '',
      });
    }
    setShowNightReviewModal(true);
  };

  const handleSaveNightReview = async () => {
    try {
      await db.dayLogs.update(selectedDateStr, {
        dayOverall: nightReviewForm.dayOverall,
        dinnerAmount: nightReviewForm.dinnerAmount,
        note: nightReviewForm.note,
        updatedAt: Date.now(),
      });
      setShowNightReviewModal(false);
    } catch (error) {
      // If update fails (e.g. key doesn't exist), try put but we need to respect existing fields if any
      const existing = await db.dayLogs.get(selectedDateStr);
      await db.dayLogs.put({
        ...existing,
        id: selectedDateStr,
        dayOverall: nightReviewForm.dayOverall,
        dinnerAmount: nightReviewForm.dinnerAmount,
        note: nightReviewForm.note,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      setShowNightReviewModal(false);
    }
  };

  // Daily Data (Morning Check-in) Modal State
  const [showDailyDataModal, setShowDailyDataModal] = useState(false);
  const [dailyDataForm, setDailyDataForm] = useState({
    sleepQuality: 3,
    morningArousal: 3,
    migraineProdrome: 0,
    isMenstruation: false,
    todayMode: 'normal' as 'normal' | 'eco' | 'rest',
    sleepTime: '23:00',
    wakeTime: '07:00',
  });

  const openDailyDataModal = () => {
    if (selectedDayLog) {
      setDailyDataForm({
        sleepQuality: selectedDayLog.sleepQuality ?? 3,
        morningArousal: selectedDayLog.morningArousal ?? 3,
        migraineProdrome: selectedDayLog.migraineProdrome ?? 0,
        isMenstruation: selectedDayLog.isMenstruation ?? false,
        todayMode: selectedDayLog.todayMode ?? 'normal',
        sleepTime: selectedDayLog.sleepStart ? new Date(selectedDayLog.sleepStart).toTimeString().slice(0, 5) : '23:00',
        wakeTime: selectedDayLog.sleepEnd ? new Date(selectedDayLog.sleepEnd).toTimeString().slice(0, 5) : '07:00',
      });
    } else {
      // Reset to defaults
      setDailyDataForm({
        sleepQuality: 3,
        morningArousal: 3,
        migraineProdrome: 0,
        isMenstruation: false,
        todayMode: 'normal',
        sleepTime: '23:00',
        wakeTime: '07:00',
      });
    }
    setShowDailyDataModal(true);
  };

  const handleSaveDailyData = async () => {
    const wakeD = new Date(`${selectedDateStr}T${dailyDataForm.wakeTime}`);
    const sleepD = new Date(`${selectedDateStr}T${dailyDataForm.sleepTime}`);

    // Adjust sleep date if it crosses midnight (sleep time > wake time usually implies sleep started previous day, but here we just need relative logic)
    // Actually, simple logic: if sleepTime is after 12:00 and wakeTime is morning, sleepD was yesterday.
    // Let's assume input implies the contextual sleep/wake for THIS record date.
    if (parseInt(dailyDataForm.sleepTime.split(':')[0]) > 12 && parseInt(dailyDataForm.wakeTime.split(':')[0]) < 12) {
      sleepD.setDate(sleepD.getDate() - 1);
    }

    try {
      // Use put to upsert
      await db.dayLogs.put({
        id: selectedDateStr,
        sleepStart: sleepD,
        sleepEnd: wakeD,
        sleepQuality: dailyDataForm.sleepQuality,
        morningArousal: dailyDataForm.morningArousal,
        migraineProdrome: dailyDataForm.migraineProdrome,
        isMenstruation: dailyDataForm.isMenstruation,
        todayMode: dailyDataForm.todayMode,
        createdAt: selectedDayLog?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      setShowDailyDataModal(false);
    } catch (error) {
      console.error("Failed to save daily data", error);
      alert("保存に失敗しました");
    }
  };

  // Add Log State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLogType, setNewLogType] = useState<'symptom' | 'medicine'>('symptom');
  const [newLogName, setNewLogName] = useState('');
  const [newLogTime, setNewLogTime] = useState('12:00');

  const startEdit = (log: EventLog) => {
    if (!log.id) return;
    const date = new Date(log.timestamp);
    // HH:mm string
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    setEditingLogId(log.id);
    setEditForm({ name: log.name, time: timeStr });
  };

  const saveEdit = async (id: number) => {
    const [hours, mins] = editForm.time.split(':').map(Number);
    const newDate = new Date(selectedDate); // Use selected date as base
    newDate.setHours(hours, mins);

    await db.eventLogs.update(id, {
      name: editForm.name,
      timestamp: newDate.getTime()
    });
    setEditingLogId(null);
  };

  const handleAddLog = async () => {
    if (!newLogName) return;
    const [hours, mins] = newLogTime.split(':').map(Number);
    const logDate = new Date(selectedDate);
    logDate.setHours(hours, mins);

    await db.eventLogs.add({
      date: selectedDateStr,
      type: newLogType,
      name: newLogName,
      severity: 1,
      timestamp: logDate.getTime(),
      note: '' // Ensure note exists for schema validation
    });

    setShowAddModal(false);
    setNewLogName('');
  };

  const toggleVisitComplete = async (visitId: number, current: boolean) => {
    await db.clinicVisits.update(visitId, { isCompleted: !current });
  };

  // 日付ごとのスコア計算
  const getDayScore = (dateStr: string) => {
    const log = monthlyDayLogs?.find(l => l.id === dateStr);
    if (!log) return null;

    // dayOverallがあれば優先 (Good=5, Fair=3, Bad=1)
    if (log.dayOverall === 'good') return 5;
    if (log.dayOverall === 'fair') return 3;
    if (log.dayOverall === 'bad') return 1;

    // なければ睡眠スコア
    if (log.sleepQuality) return log.sleepQuality;

    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 5) return 'bg-emerald-400 shadow-emerald-200 dark:shadow-none'; // 5: Green
    if (score >= 4) return 'bg-teal-400 shadow-teal-200 dark:shadow-none';       // 4: Blue/Teal (slightly green)
    if (score >= 3) return 'bg-sky-400 shadow-sky-200 dark:shadow-none';        // 3: Light Blue
    if (score >= 2) return 'bg-orange-400 shadow-orange-200 dark:shadow-none';  // 2: Orange
    return 'bg-rose-400 shadow-rose-200 dark:shadow-none';                      // 1: Red/Pink
  };

  return (
    <PageLayout title="カレンダー" headerActions={<ThemeToggle />}>
      {/* Delete Modal moved to Portal */}

      <div className="grid lg:grid-cols-[1fr_350px] gap-6 max-w-6xl mx-auto lg:h-[calc(100vh-100px)] h-auto">
        {/* Calendar Section */}
        <Card className="lg:h-full h-auto flex flex-col min-h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <div key={i} className={cn("text-xs font-medium py-1", i === 0 && "text-red-500", i === 6 && "text-blue-500")}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 lg:h-full h-auto lg:auto-rows-fr auto-rows-auto">
              {calendarDays.map((d, i) => {
                const dateStr = toLocalDateStr(d.date);
                const isSelected = d.date.toDateString() === selectedDate.toDateString();
                const isToday = d.date.toDateString() === new Date().toDateString();
                const score = getDayScore(dateStr);
                const visit = monthlyVisits?.find(v => v.date === dateStr);
                const hasLogs = monthlyEventLogs?.some(log => log.date === dateStr);

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDate(d.date);
                      // If click outside current month, change month view? optional
                      if (!d.isCurrentMonth) setCurrentDate(d.date);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-start py-2 rounded-lg transition-all min-h-[60px] relative overflow-hidden",
                      !d.isCurrentMonth && "text-slate-300 dark:text-slate-700 bg-slate-50/50 dark:bg-slate-900/50",
                      isSelected ? "bg-white dark:bg-slate-800 ring-2 ring-brand-500 z-10 shadow-lg" : "hover:bg-slate-50 dark:hover:bg-slate-800",
                      isToday && !isSelected && "bg-brand-50/50"
                    )}
                  >
                    <span className={cn(
                      "text-sm z-10 w-6 h-6 flex items-center justify-center rounded-full mb-1",
                      isToday && "bg-brand-500 text-white font-bold",
                      !isToday && isSelected && "text-brand-600 font-bold",
                    )}>
                      {d.date.getDate()}
                    </span>

                    <div className="flex flex-col items-center gap-0.5">
                      {/* Clinic Visit Indicator */}
                      {visit && (
                        <div className={cn(
                          "flex items-center justify-center w-4 h-4 rounded-full text-[10px]",
                          visit.isCompleted
                            ? "bg-indigo-500 text-white dark:bg-indigo-400 dark:text-slate-900"
                            : "border border-indigo-400 text-indigo-500 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900"
                        )}>
                          {visit.isCompleted ? <Check className="w-2.5 h-2.5" /> : <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                        </div>
                      )}

                      {/* Condition Indicator */}
                      {score !== null && (
                        <div className={cn(
                          "w-3 h-3 rounded-full shadow-sm transition-transform",
                          getScoreColor(score),
                          isSelected && "scale-110"
                        )} />
                      )}

                      {/* Log Existence Dot */}
                      {!score && hasLogs && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Logs Section */}
        <Card className="lg:h-full h-auto flex flex-col lg:overflow-hidden min-h-[200px]">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <CardTitle className="text-lg">
              {selectedDate.getMonth() + 1}月 {selectedDate.getDate()}日の記録
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">

              {/* Clinic Visit Summary */}
              {selectedDayVisit && (
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        通院予定: {clinics?.find(c => c.id === selectedDayVisit.clinicId)?.name || '未登録クリニック'}
                      </span>
                    </div>
                    <Button
                      variant={selectedDayVisit.isCompleted ? "primary" : "outline"}
                      size="sm"
                      onClick={() => toggleVisitComplete(selectedDayVisit.id!, selectedDayVisit.isCompleted)}
                      className={cn(
                        "h-8 text-xs gap-1.5",
                        selectedDayVisit.isCompleted ? "bg-indigo-600 hover:bg-indigo-700" : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      )}
                    >
                      {selectedDayVisit.isCompleted ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          受診済み
                        </>
                      ) : (
                        <>
                          <Circle className="h-3.5 w-3.5" />
                          未受診
                        </>
                      )}
                    </Button>
                  </div>
                  {selectedDayVisit.time && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-6">
                      <Clock className="h-3 w-3" />
                      {selectedDayVisit.time}
                    </div>
                  )}
                  {selectedDayVisit.note && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 pl-6 border-l-2 border-indigo-200 dark:border-indigo-800 ml-1.5">
                      {selectedDayVisit.note}
                    </div>
                  )}
                </div>
              )}

              {/* Night Review Summary */}
              {selectedDayLog && (selectedDayLog.dayOverall || selectedDayLog.note || selectedDayLog.echoSummary) && (
                <div className="p-4 bg-indigo-50/30 dark:bg-indigo-900/10 relative group border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-indigo-500 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Moon className="w-3 h-3" /> Night Review
                    </span>
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0" onClick={openNightReviewModal}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {selectedDayLog.dayOverall && (
                    <div className="flex gap-4 mb-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">総合</span>
                        <span className={cn("font-bold",
                          selectedDayLog.dayOverall === 'good' ? "text-emerald-600" :
                            selectedDayLog.dayOverall === 'bad' ? "text-red-600" : "text-slate-600"
                        )}>
                          {selectedDayLog.dayOverall === 'good' ? '良い' : selectedDayLog.dayOverall === 'bad' ? '悪い' : '普通'}
                        </span>
                      </div>
                      {selectedDayLog.dinnerAmount && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">夕食</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {selectedDayLog.dinnerAmount === 'light' ? '少なめ' : selectedDayLog.dinnerAmount === 'heavy' ? '多め' : '普通'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDayLog.echoSummary && (
                    <div className="mb-3 bg-white dark:bg-slate-900/50 p-3 rounded border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 mb-1">
                        <Sparkles className="w-3 h-3" /> AI Summary
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown>{selectedDayLog.echoSummary}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {selectedDayLog.note && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap border-l-2 border-slate-300 dark:border-slate-700 pl-2">
                      {selectedDayLog.note}
                    </div>
                  )}
                </div>
              )}

              {/* DayLog Summary or Add Button */}
              {selectedDayLog && (selectedDayLog.sleepQuality || selectedDayLog.morningArousal) ? (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 relative group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">Daily Log</span>
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0" onClick={openDailyDataModal}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {selectedDayLog.sleepQuality && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400 text-xs text-left w-16">睡眠の質</span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-amber-500">{'★'.repeat(selectedDayLog.sleepQuality)}{'☆'.repeat(5 - selectedDayLog.sleepQuality)}</span>
                          {selectedDayLog.sleepStart && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">
                              {new Date(selectedDayLog.sleepStart).getHours()}:{String(new Date(selectedDayLog.sleepStart).getMinutes()).padStart(2, '0')} - {selectedDayLog.sleepEnd ? `${new Date(selectedDayLog.sleepEnd).getHours()}:${String(new Date(selectedDayLog.sleepEnd).getMinutes()).padStart(2, '0')}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedDayLog.morningArousal && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400 text-xs w-16">覚醒度</span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400" style={{ width: `${(selectedDayLog.morningArousal / 5) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{selectedDayLog.morningArousal}/5</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <Button variant="outline" className="w-full h-auto py-3 justify-start gap-3 border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={openDailyDataModal}>
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full text-orange-500">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">朝のチェックインを追加</span>
                      <span className="text-xs text-slate-500">睡眠時間や起床時の調子を記録</span>
                    </div>
                  </Button>
                </div>
              )}

              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group cursor-pointer" onClick={() => startEdit(log)}>
                    {editingLogId === log.id ? (
                      <div className="space-y-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Input
                            type="time"
                            className="w-24 border-slate-200"
                            value={editForm.time}
                            onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                          />
                          <Input
                            className="flex-1 border-slate-200"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingLogId(null)}>
                            <X className="h-4 w-4 mr-1" /> キャンセル
                          </Button>
                          <Button size="sm" onClick={() => saveEdit(log.id!)}>
                            <Check className="h-4 w-4 mr-1" /> 保存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {new Date(log.timestamp).getHours().toString().padStart(2, '0')}:
                              {new Date(log.timestamp).getMinutes().toString().padStart(2, '0')}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                {log.name.includes('(') ? log.name.split('(')[0].trim() : log.name}
                              </span>

                              {log.type === 'trigger' && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shrink-0 ml-1.5" title="考えられる原因" />
                              )}

                              {/* Severity Display */}
                              {(log.severity !== undefined && log.severity > 0) && (
                                (log.type === 'medicine' || log.type === 'food') ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={cn(
                                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center shrink-0 text-white",
                                      log.type === 'medicine' ? "bg-brand-500 shadow-sm" : "bg-emerald-500 shadow-sm"
                                    )}>
                                      x{log.severity}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex gap-0.5 items-end h-3 ml-1">
                                      {[1, 2, 3].map((level) => (
                                        <div
                                          key={level}
                                          className={cn(
                                            "w-1 rounded-sm transition-all",
                                            level <= log.severity
                                              ? (level === 3 ? "bg-rose-500 h-3" : level === 2 ? "bg-amber-400 h-2" : "bg-slate-400 h-1.5")
                                              : "bg-slate-200 dark:bg-slate-700 h-1"
                                          )}
                                        />
                                      ))}
                                    </div>
                                    <span className={cn(
                                      "text-[10px] font-black",
                                      log.severity === 3 ? "text-rose-600 dark:text-rose-400" :
                                        log.severity === 2 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                                    )}>
                                      {log.severity === 3 ? '強' : log.severity === 2 ? '中' : '弱'}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn(
                                "text-[10px] uppercase font-bold px-1 rounded border",
                                log.type === 'symptom' ? "text-red-500 border-red-200 bg-red-50 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-300" :
                                  log.type === 'medicine' ? "text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300" :
                                    log.type === 'trigger' ? "text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300" :
                                      "text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
                              )}>
                                {log.type === 'symptom' ? '症状' : log.type === 'medicine' ? '薬' : log.type === 'trigger' ? '原因' : '食事'}
                              </span>
                              {(log.note || log.name.includes('(')) && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {log.name.includes('(') ? log.name.match(/\((.*?)\)/)?.[1] : ''} {log.note}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); startEdit(log); }}>
                            <Edit2 className="h-4 w-4 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteClick(log.id!); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-slate-400"> {/* Removed specific condition checking to ensure this shows when logs is empty */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-3">
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className="text-sm">記録はありません</p>
                </div>
              )}

            </div> {/* Closing divide-y div */}
          </CardContent>
          {/* Add Log Button Block - Moved outside scroll area */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
            <Button onClick={() => setShowAddModal(true)} className="w-full gap-2 font-bold shadow-md">
              <Plus className="h-4 w-4" /> この日の記録を追加
            </Button>
          </div>
        </Card>
      </div>
      {/* Delete Confirmation Modal Portal */}
      {deleteTargetId && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteTargetId(null)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-800 transform transition-all scale-100 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">ログを削除しますか？</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              この操作は取り消せません。本当に削除してもよろしいですか？
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTargetId(null)}>
                キャンセル
              </Button>
              <Button
                variant="outline"
                className="bg-red-50 hover:bg-red-100 text-red-600 border-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-900"
                onClick={executeDelete}
              >
                削除する
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Log Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAddModal(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-center font-bold mb-6 text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
              <span className="text-lg">{selectedDate.getMonth() + 1}/{selectedDate.getDate()}</span>
              <span className="text-slate-400 font-normal text-sm">に記録を追加</span>
            </h3>

            <div className="space-y-4">
              {/* Type Selection */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNewLogType('symptom')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all",
                    newLogType === 'symptom' ? "bg-white dark:bg-slate-700 shadow text-red-600 dark:text-red-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}
                >
                  <Zap className="h-4 w-4" /> 症状
                </button>
                <button
                  type="button"
                  onClick={() => setNewLogType('medicine')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all",
                    newLogType === 'medicine' ? "bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}
                >
                  <Pill className="h-4 w-4" /> お薬
                </button>
              </div>

              {/* Name Input / Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">内容</label>
                {newLogType === 'medicine' && medicines && medicines.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {medicines.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setNewLogName(m.name)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
                          newLogName === m.name
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        )}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                <Input
                  placeholder={newLogType === 'symptom' ? "頭痛, めまい, etc." : "薬の名前"}
                  value={newLogName}
                  onChange={e => setNewLogName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Time Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">時間</label>
                <Input
                  type="time"
                  value={newLogTime}
                  onChange={e => setNewLogTime(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <Button className="w-full h-12 mt-4 font-bold" onClick={handleAddLog} disabled={!newLogName}>
                追加する
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Night Review Modal */}
      {showNightReviewModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" onClick={() => setShowNightReviewModal(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-200 my-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-center font-bold mb-4 text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
              <Moon className="h-5 w-5 text-indigo-500" />
              <span>Night Review</span>
            </h3>
            <p className="text-center text-xs text-slate-500 mb-6">{selectedDate.getMonth() + 1}/{selectedDate.getDate()} の記録</p>

            <div className="space-y-4">
              {/* Overall & Dinner */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">今日の総合</label>
                  <div className="flex gap-1">
                    {(['good', 'fair', 'bad'] as const).map(opt => (
                      <button key={opt}
                        onClick={() => setNightReviewForm({ ...nightReviewForm, dayOverall: opt })}
                        className={cn(
                          "flex-1 py-2 rounded text-xs font-bold capitalize border transition-all",
                          nightReviewForm.dayOverall === opt
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
                  <label className="text-xs font-bold text-slate-500">夕食の量</label>
                  <div className="flex gap-1">
                    {(['light', 'medium', 'heavy'] as const).map(opt => (
                      <button key={opt}
                        onClick={() => setNightReviewForm({ ...nightReviewForm, dinnerAmount: opt })}
                        className={cn(
                          "flex-1 py-2 rounded text-xs font-bold capitalize border transition-all",
                          nightReviewForm.dinnerAmount === opt
                            ? "bg-brand-100 text-brand-700 border-brand-400 dark:bg-brand-900/40 dark:text-brand-300 dark:border-brand-700"
                            : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        {opt === 'light' ? '少' : opt === 'medium' ? '普' : '多'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">フリーメモ</label>
                <Textarea
                  placeholder="今日の日記..."
                  value={nightReviewForm.note}
                  onChange={e => setNightReviewForm({ ...nightReviewForm, note: e.target.value })}
                  className="h-24 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setShowNightReviewModal(false)}>
                  キャンセル
                </Button>
                <Button className="flex-1 font-bold bg-indigo-500 hover:bg-indigo-600 text-white" onClick={handleSaveNightReview}>
                  保存する
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Daily Data (Check-in) Modal */}
      {showDailyDataModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" onClick={() => setShowDailyDataModal(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-200 my-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-center font-bold mb-4 text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
              <Sun className="h-5 w-5 text-orange-500" />
              <span>モーニングチェックイン</span>
            </h3>
            <p className="text-center text-xs text-slate-500 mb-6">{selectedDate.getMonth() + 1}/{selectedDate.getDate()} の記録</p>

            <div className="space-y-6">
              {/* Sleep Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">就寝</label>
                  <Input
                    type="time"
                    value={dailyDataForm.sleepTime}
                    onChange={e => setDailyDataForm({ ...dailyDataForm, sleepTime: e.target.value })}
                    className="text-center bg-slate-50 dark:bg-slate-800"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">起床</label>
                  <Input
                    type="time"
                    value={dailyDataForm.wakeTime}
                    onChange={e => setDailyDataForm({ ...dailyDataForm, wakeTime: e.target.value })}
                    className="text-center bg-slate-50 dark:bg-slate-800"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">睡眠の質</span>
                    <span className="font-bold text-brand-600">{dailyDataForm.sleepQuality}</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    className="w-full accent-brand-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                    value={dailyDataForm.sleepQuality}
                    onChange={e => setDailyDataForm({ ...dailyDataForm, sleepQuality: parseInt(e.target.value) })}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 px-1">
                    <span>悪い</span>
                    <span>良い</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">目覚めの良さ</span>
                    <span className="font-bold text-amber-500">{dailyDataForm.morningArousal}</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="1"
                    className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                    value={dailyDataForm.morningArousal}
                    onChange={e => setDailyDataForm({ ...dailyDataForm, morningArousal: parseInt(e.target.value) })}
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 px-1">
                    <span>悪い</span>
                    <span>良い</span>
                  </div>
                </div>
              </div>

              {/* Prodrome & Menstruation */}
              <div className="flex items-center justify-between py-2 border-t border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-500">頭痛予兆</span>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((level) => (
                      <button
                        key={level}
                        onClick={() => setDailyDataForm({ ...dailyDataForm, migraineProdrome: level })}
                        className={cn(
                          "h-8 w-8 rounded-full text-xs font-bold transition-all border flex items-center justify-center",
                          dailyDataForm.migraineProdrome === level
                            ? "bg-rose-500 text-white border-rose-500 shadow-md transform scale-105"
                            : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {level === 0 ? '-' : level}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">生理</span>
                  <Switch
                    checked={dailyDataForm.isMenstruation}
                    onChange={(e) => setDailyDataForm({ ...dailyDataForm, isMenstruation: e.target.checked })}
                  />
                </div>
              </div>

              {/* Today Mode */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500">コンディションモード</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'eco', 'rest'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDailyDataForm({ ...dailyDataForm, todayMode: mode })}
                      className={cn(
                        "rounded-lg py-2 text-xs font-bold uppercase transition-all border-2",
                        dailyDataForm.todayMode === mode
                          ? "bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "bg-transparent border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                      )}
                    >
                      {mode === 'normal' ? '通常' : mode === 'eco' ? '省エネ' : '養生'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button className="w-full font-bold h-12" onClick={handleSaveDailyData}>
                  保存する
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PageLayout>
  );
}
