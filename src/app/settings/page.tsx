'use client';

import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useSetting } from '@/hooks/useSettings';
import { db } from '@/db/db';
import { Download, Upload, Trash2, AlertTriangle, ChevronDown, Check, Pill, Plus } from 'lucide-react';
import { useRegimen } from '@/hooks/useRegimen';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 設定値（通知）
  const { value: notificationsEnabled, setValue: setNotificationsEnabled } =
    useSetting<boolean>('notificationsEnabled', false);

  // 設定値（プロフィール）
  const { value: userProfile, setValue: setUserProfile } =
    useSetting<{ name: string }>('userProfile', { name: '美伶' });
  const { setRegimen, activeRegimen } = useRegimen();

  // レジメン入力用State
  const [regimenForm, setRegimenForm] = useState({
    type: 'tapering',
    startDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  // Clinic States
  const [newClinicName, setNewClinicName] = useState('');
  const [newVisit, setNewVisit] = useState({ date: '', time: '', note: '', clinicId: 0 });
  const [showClinicSelector, setShowClinicSelector] = useState(false);
  const [showRegimenModal, setShowRegimenModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const clinics = useLiveQuery(() => db.clinics.toArray());
  const visits = useLiveQuery(() => db.clinicVisits.orderBy('date').toArray());
  const medicines = useLiveQuery(() => db.medicines.toArray());

  // Medicine Form
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    type: 'regular' as 'regular' | 'prn',
    dailyDose: ''
  });

  const handleAddClinic = async () => {
    if (!newClinicName.trim()) return;
    await db.clinics.add({ name: newClinicName });
    setNewClinicName('');
  };

  const handleDeleteClinic = async (id: number) => {
    if (confirm('このクリニックを削除しますか？')) {
      await db.clinics.delete(id);
    }
  };

  const handleAddVisit = async () => {
    if (!newVisit.clinicId || !newVisit.date) return;
    await db.clinicVisits.add({
      clinicId: newVisit.clinicId,
      date: newVisit.date,
      time: newVisit.time,
      note: newVisit.note,
      isCompleted: false
    });
    setNewVisit({ date: '', time: '', note: '', clinicId: 0 });
  };

  const handleDeleteVisit = async (id: number) => {
    if (confirm('予定を削除しますか？')) {
      await db.clinicVisits.delete(id);
    }
  };

  const handleAddMedicine = async () => {
    if (!newMed.name) return;
    await db.medicines.add({
      name: newMed.name,
      dosage: newMed.dosage,
      type: newMed.type,
      dailyDose: newMed.type === 'regular' ? newMed.dailyDose : undefined,
      updatedAt: Date.now()
    });
    setNewMed({ name: '', dosage: '', type: 'regular', dailyDose: '' });
  };

  const handleDeleteMedicine = async (id: number) => {
    if (confirm('このお薬を削除しますか？')) {
      await db.medicines.delete(id);
    }
  };

  const handleSaveProfile = (name: string) => {
    setUserProfile({ ...userProfile, name });
  };

  const handleSubmitRegimen = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMessage('');


    try {
      await setRegimen({
        type: regimenForm.type as any,
        startDate: regimenForm.startDate,
        description: regimenForm.description,
      });

      setRegimenForm({
        ...regimenForm,
        description: '',
      });
      setShowRegimenModal(false);
    } catch (error) {
      console.error(error);
      setErrorMessage('保存中にエラーが発生しました');
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const allData = {
        dayLogs: await db.dayLogs.toArray(),
        eventLogs: await db.eventLogs.toArray(),
        regimenHistory: await db.regimenHistory.toArray(),
        settings: await db.settings.toArray(),
        clinics: await db.clinics.toArray(),
        clinicVisits: await db.clinicVisits.toArray(),
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coe-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('データのエクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          setIsImporting(true);
          const text = await file.text();
          const data = JSON.parse(text);

          // トランザクションで一括インポート
          await db.transaction('rw', [db.dayLogs, db.eventLogs, db.regimenHistory, db.settings, db.clinics, db.clinicVisits], async () => {
            if (data.dayLogs) await db.dayLogs.bulkPut(data.dayLogs);
            if (data.eventLogs) await db.eventLogs.bulkPut(data.eventLogs);
            if (data.regimenHistory) await db.regimenHistory.bulkPut(data.regimenHistory);
            if (data.settings) await db.settings.bulkPut(data.settings);
            if (data.clinics) await db.clinics.bulkPut(data.clinics);
            if (data.clinicVisits) await db.clinicVisits.bulkPut(data.clinicVisits);
          });

          alert('データのインポートが完了しました');
        } catch (error) {
          console.error('インポートエラー:', error);
          alert('データのインポートに失敗しました。ファイル形式を確認してください。');
        } finally {
          setIsImporting(false);
        }
      };
      input.click();
    } catch (error) {
      console.error('インポートエラー:', error);
    }
  };

  const handleClearData = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    try {
      setIsClearing(true);
      await db.transaction('rw', [db.dayLogs, db.eventLogs, db.regimenHistory, db.clinics, db.clinicVisits], async () => {
        await db.dayLogs.clear();
        await db.eventLogs.clear();
        await db.regimenHistory.clear();
        await db.clinics.clear();
        await db.clinicVisits.clear();
      });
      setShowClearConfirm(false);
      alert('すべてのデータを削除しました');
    } catch (error) {
      console.error('データ削除エラー:', error);
      alert('データの削除に失敗しました');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <PageLayout title="設定" headerActions={<ThemeToggle />}>
      <div className="space-y-6 max-w-xl mx-auto">

        {/* プロフィール設定 */}
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
            <CardDescription>アプリ内で呼ばれる名前を設定します</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">お名前</label>
              <Input
                value={userProfile?.name || ''}
                onChange={(e) => handleSaveProfile(e.target.value)}
                placeholder="名前を入力"
              />
            </div>
          </CardContent>
        </Card>

        {/* 服薬フェーズ設定 */}
        <Card>
          <CardHeader>
            <CardTitle>服薬フェーズ管理</CardTitle>
            <CardDescription>現在の減薬・維持状況を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeRegimen && (
              <div className="bg-brand-50 dark:bg-brand-900/30 p-4 rounded-lg border border-brand-100 dark:border-brand-800 mb-4">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 block mb-1">現在進行中</span>
                <div className="font-bold text-lg">
                  {activeRegimen.type === 'tapering' ? '減薬期' : activeRegimen.type === 'titration' ? '増薬・導入期' : '維持期'}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({activeRegimen.startDate}開始)
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {activeRegimen.description}
                </p>
              </div>
            )}

            <div className="pt-2">
              <Button onClick={() => setShowRegimenModal(true)} variant="outline" className="w-full text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/30">
                フェーズ変更 / 設定
              </Button>
            </div>

            {/* Regimen Modal */}
            {showRegimenModal && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowRegimenModal(false)}>
                <div
                  className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 mx-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-center font-bold mb-6 text-slate-900 dark:text-slate-100 text-lg">服薬フェーズ設定</h3>

                  <form onSubmit={handleSubmitRegimen} className="space-y-5">
                    {errorMessage && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {errorMessage}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">フェーズタイプ</label>
                      <div className="flex gap-2">
                        {(['maintenance', 'tapering', 'titration'] as const).map(type => (
                          <button
                            type="button"
                            key={type}
                            onClick={() => setRegimenForm({ ...regimenForm, type })}
                            className={cn(
                              "flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all",
                              regimenForm.type === type
                                ? "bg-brand-500 text-white border-brand-500 shadow-md ring-2 ring-brand-200 dark:ring-brand-900"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                            )}
                          >
                            {type === 'maintenance' ? '維持期' : type === 'tapering' ? '減薬期' : '増薬/導入'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">開始日</label>
                      <Input
                        type="date"
                        value={regimenForm.startDate}
                        onChange={e => setRegimenForm({ ...regimenForm, startDate: e.target.value })}
                        className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>


                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" type="button" className="flex-1 h-12 rounded-xl" onClick={() => setShowRegimenModal(false)}>キャンセル</Button>
                      <Button type="submit" className="flex-1 h-12 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white">
                        設定を保存
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 通院管理 */}
        <Card>
          <CardHeader>
            <CardTitle>通院管理</CardTitle>
            <CardDescription>クリニックの登録と次回の通院予定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Clinic List */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">登録済みクリニック</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {clinics?.map(clinic => (
                  <div key={clinic.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 text-sm">
                    <span>{clinic.name}</span>
                    <button onClick={() => handleDeleteClinic(clinic.id!)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(!clinics || clinics.length === 0) && <span className="text-sm text-slate-400">登録なし</span>}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="クリニック名 (例: メンタルクリニック)"
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddClinic} disabled={!newClinicName}>追加</Button>
              </div>
            </div>

            {/* Visit List */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">通院予定 / 履歴</h3>
              <div className="space-y-3 mb-4">
                {visits?.map(visit => {
                  const clinic = clinics?.find(c => c.id === visit.clinicId);
                  return (
                    <div key={visit.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 shrink-0 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
                          <span className="text-xs font-bold text-slate-500 uppercase">{new Date(visit.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-none">{new Date(visit.date).getDate()}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{clinic?.name || '不明なクリニック'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{visit.time || '--:--'}</span>
                            {visit.note && <span>- {visit.note}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => db.clinicVisits.update(visit.id!, { isCompleted: !visit.isCompleted })}
                          className={cn("p-1.5 rounded-full transition-colors", visit.isCompleted ? "text-emerald-500 bg-emerald-50" : "text-slate-300 hover:text-slate-400")}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteVisit(visit.id!)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(!visits || visits.length === 0) && <span className="text-sm text-slate-400">予定なし</span>}
              </div>

              <div className="grid gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-500">
                  予定を追加
                  <span className="text-xs font-normal text-slate-400 ml-2">（過去の日付で前回の通院日が登録できます）</span>
                </span>

                <div className="space-y-3">
                  {/* Custom Clinic Selector */}
                  <div
                    onClick={() => setShowClinicSelector(true)}
                    className="w-full p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-[0.99] transition-all"
                  >
                    <span className={newVisit.clinicId ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-400"}>
                      {newVisit.clinicId
                        ? clinics?.find(c => c.id === newVisit.clinicId)?.name
                        : "クリニックを選択..."}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>

                  {/* Bottom Sheet Modal for Clinic Selection */}
                  {showClinicSelector && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowClinicSelector(false)}>
                      <div
                        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 mx-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        <h3 className="text-center font-bold mb-4 text-slate-900 dark:text-slate-100 text-lg">クリニックを選択</h3>
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
                          {clinics?.map(c => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setNewVisit({ ...newVisit, clinicId: c.id! });
                                setShowClinicSelector(false);
                              }}
                              className={cn(
                                "w-full p-4 rounded-xl text-left font-bold transition-all flex items-center justify-between",
                                newVisit.clinicId === c.id
                                  ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 ring-1 ring-brand-200 dark:ring-brand-800"
                                  : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                              )}
                            >
                              {c.name}
                              {newVisit.clinicId === c.id && <Check className="h-5 w-5" />}
                            </button>
                          ))}
                          {(!clinics || clinics.length === 0) && (
                            <div className="text-center py-6 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                              登録されたクリニックがありません
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setShowClinicSelector(false)}
                          className="w-full p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      value={newVisit.date}
                      onChange={e => setNewVisit({ ...newVisit, date: e.target.value })}
                      className="bg-white dark:bg-slate-800 dark:border-slate-700"
                      style={{ colorScheme: 'dark' }}
                    />
                    <Input
                      type="time"
                      value={newVisit.time}
                      onChange={e => setNewVisit({ ...newVisit, time: e.target.value })}
                      className="bg-white dark:bg-slate-800 dark:border-slate-700"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  <Input
                    placeholder="メモ (例: 血液検査あり)"
                    value={newVisit.note}
                    onChange={e => setNewVisit({ ...newVisit, note: e.target.value })}
                    className="bg-white dark:bg-slate-800 dark:border-slate-700"
                  />

                  <Button className="w-full" onClick={handleAddVisit} disabled={!newVisit.clinicId || !newVisit.date}>
                    <Check className="h-4 w-4 mr-2" />
                    予約を登録
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 処方薬管理 */}
        <Card>
          <CardHeader>
            <CardTitle>お薬の管理</CardTitle>
            <CardDescription>処方されている薬を登録します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* List */}
              <div className="space-y-2">
                {medicines?.map(med => (
                  <div key={med.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-full", med.type === 'prn' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400")}>
                        <Pill className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {med.name}
                            {med.dosage && <span className="text-xs font-normal text-slate-500 ml-1">({med.dosage})</span>}
                          </p>
                          {med.type === 'prn' && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                              頓
                            </span>
                          )}
                        </div>
                        {med.type === 'regular' && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            定期: 1日 {med.dailyDose || '未設定'}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteMedicine(med.id!)} className="text-slate-400 hover:text-red-500 p-2">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {(!medicines || medicines.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">登録されたお薬はありません</p>
                )}
              </div>

              {/* Form */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">新規登録</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="薬品名 (例: ソラナックス)"
                    value={newMed.name}
                    onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                    className="bg-white dark:bg-slate-800"
                  />
                  <Input
                    placeholder="量 (例: 0.4mg)"
                    value={newMed.dosage}
                    onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                    className="bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-lg w-full">
                  <button
                    type="button"
                    className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", newMed.type === 'regular' ? "bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 hover:text-slate-700")}
                    onClick={() => setNewMed({ ...newMed, type: 'regular' })}
                  >
                    定期服用
                  </button>
                  <button
                    type="button"
                    className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", newMed.type === 'prn' ? "bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 hover:text-slate-700")}
                    onClick={() => setNewMed({ ...newMed, type: 'prn' })}
                  >
                    頓服 (PRN)
                  </button>
                </div>

                {newMed.type === 'regular' && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                    <label className="text-xs text-slate-500 mb-1 block ml-1">1日あたりの量</label>
                    <Input
                      placeholder="例: 3錠, 1.2mg など"
                      value={newMed.dailyDose}
                      onChange={e => setNewMed({ ...newMed, dailyDose: e.target.value })}
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                )}

                <Button className="w-full mt-2" onClick={handleAddMedicine} disabled={!newMed.name}>
                  <Plus className="h-4 w-4 mr-1" /> 追加
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通知設定 */}
        <Card>
          <CardHeader>
            <CardTitle>通知</CardTitle>
            <CardDescription>アプリの通知設定</CardDescription>
          </CardHeader>
          <CardContent>
            <Switch
              id="notifications"
              label="通知を有効にする"
              description="重要なリマインダーやアラートを受け取ります"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
            />
          </CardContent>
        </Card>

        {/* データ管理 */}
        <Card>
          <CardHeader>
            <CardTitle>データ管理</CardTitle>
            <CardDescription>データのバックアップと復元</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'エクスポート中...' : 'データをエクスポート'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleImport}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4" />
              {isImporting ? 'インポート中...' : 'データをインポート'}
            </Button>
          </CardContent>
        </Card>

        {/* 危険な操作 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              危険な操作
            </CardTitle>
            <CardDescription>この操作は取り消せません</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {showClearConfirm ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-200">
                      すべてのデータを削除しますか？
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      この操作は取り消せません。削除前に必ずデータをエクスポートしてください。
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    onClick={handleClearData}
                    disabled={isClearing}
                  >
                    {isClearing ? '削除中...' : '削除する'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                onClick={handleClearData}
              >
                <Trash2 className="h-4 w-4" />
                すべてのデータを削除
              </Button>
            )}
          </CardContent>
        </Card>

        {/* アプリ情報 */}
        <Card>
          <CardHeader>
            <CardTitle>アプリ情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400 font-bold">使い方ガイド</span>
                <Link href="/guide" className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                  開く <ChevronDown className="h-3 w-3 -rotate-90" />
                </Link>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400 font-bold">利用規約</span>
                <Link href="/terms" className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                  確認 <ChevronDown className="h-3 w-3 -rotate-90" />
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">バージョン</span>
                <span className="text-slate-900 dark:text-slate-50">0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">データベース</span>
                <span className="text-slate-900 dark:text-slate-50">IndexedDB (Dexie)</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                <span className="text-xs text-slate-400">Powered by</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">.Env</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
