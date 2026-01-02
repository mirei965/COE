'use client';

import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  Sun, Moon, PenLine, FileText, Settings,
  Pill, Activity, CalendarDays, Share2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function GuidePage() {
  return (
    <PageLayout title="使い方ガイド">
      <div className="max-w-3xl mx-auto space-y-8 pb-10">

        {/* Intro */}
        <div className="text-center space-y-2 pb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Coe™ Powered by .Env へようこそ
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            日々の体調を記録し、医師とのコミュニケーションをサポートするアプリです。<br />
            基本的な使い方をご紹介します。
          </p>
        </div>

        {/* 1. Daily Flow */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold border-l-4 border-brand-500 pl-3 flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            毎日の記録
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sun className="h-4 w-4 text-orange-500" />
                  朝のチェックイン
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                起床時に「睡眠の質」や「目覚めの気分」を記録します。<br />
                睡眠時間は入眠時間と起床時間から自動計算されます。
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  夜の振り返り
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                1日の終わりに「今日の調子」や「日記」を記録します。<br />
                日記を書くと、AIが簡単なフィードバック（反響）を返してくれます。
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 2. Stamps */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold border-l-4 border-brand-500 pl-3 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            気になった時の記録
          </h3>
          <Card>
            <CardContent className="pt-6 text-sm space-y-3">
              <p>
                ホーム画面のスタンプボタンを使って、瞬時に記録が可能です。
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-full shrink-0"><Activity className="h-4 w-4" /></div>
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">症状スタンプ</span>
                    <span className="text-slate-500">「頭痛」「動悸」など、症状が出た瞬間にタップします。強さ（小・中・大）も選べます。</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0"><Pill className="h-4 w-4" /></div>
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">頓服スタンプ</span>
                    <span className="text-slate-500">頓服薬を飲んだ時にタップします。レポートで服用回数を確認できます。</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Report */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold border-l-4 border-brand-500 pl-3 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            診察用レポート
          </h3>
          <Card>
            <CardContent className="pt-6 text-sm text-slate-600 dark:text-slate-400 space-y-3">
              <p>
                記録されたデータをもとに、医師向けのレポートを作成します。<br />
                画面下部のメニュー「レポート」からアクセスできます。
              </p>
              <ul className="list-disc list-inside space-y-1 ml-1 text-slate-700 dark:text-slate-300">
                <li><span className="font-bold">自動要約</span>: AIが期間中の体調変化を文章化します。</li>
                <li><span className="font-bold">グラフ</span>: 睡眠の質と症状の発生頻度を可視化します。</li>
                <li><span className="font-bold">病院別フィルタ</span>: 通院先の病院を選ぶと、前回の通院日からのデータを表示します。</li>
              </ul>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs">
                💡 右上のプリンターアイコンから、印刷またはPDF保存が可能です。診察時にスマホ画面を見せるか、印刷して持参しましょう。
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 4. Settings */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold border-l-4 border-brand-500 pl-3 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            設定・その他
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  通院・お薬管理
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                設定画面で「次回予約」や「処方薬」を登録できます。<br />
                ホーム画面に次回の予定が表示されます。
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  バックアップ
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                データは端末内（ブラウザ）に保存されます。<br />
                機種変更時やデータ消失に備え、定期的に「データ管理」からエクスポートを行ってください。
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="pt-4 text-center">
          <Link href="/">
            <Button size="lg" className="font-bold px-8 rounded-full">
              記録を始める
            </Button>
          </Link>
        </div>

      </div>
    </PageLayout>
  );
}
