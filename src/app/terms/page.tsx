'use client';

import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ScrollText, ShieldAlert, Database, Scale } from 'lucide-react';

export default function TermsPage() {
  return (
    <PageLayout title="利用規約">
      <div className="max-w-3xl mx-auto space-y-6 pb-10">

        <div className="text-center space-y-2 pb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Coe™ 利用規約
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Powered by .Env
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-500" />
              1. 総則
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <p>
              本規約は、.Env（以下「運営者」）が提供するヘルスログアプリケーション「Coe」（以下「本アプリ」）の利用条件を定めるものです。
              利用者は、本アプリを利用することで、本規約に同意したものとみなされます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              2. 免責事項（医療情報の取り扱い）
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <p>
              本アプリは、日々の体調や服薬状況を記録・管理するためのツールであり、<span className="font-bold text-slate-900 dark:text-slate-200">医療行為や医学的アドバイスを提供するものではありません。</span>
            </p>
            <p>
              AIチャット機能やレポート生成機能が提供する情報は参考情報に過ぎず、医師の診断に代わるものではありません。
              体調に関する判断や服薬の調整については、必ず医師や薬剤師の指示に従ってください。
              本アプリの利用により生じた損害について、運営者は一切の責任を負いません。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" />
              3. データの取り扱い・プライバシー
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <p>
              本アプリで入力されたデータ（体調記録、日記、服薬情報など）は、原則として利用者の端末（ブラウザのIndexedDB）内に保存されます。
              運営者のサーバーに個人情報が永続的に保存されることはありません（AI生成などの一時的な処理を除く）。
            </p>
            <p>
              データのバックアップは利用者の責任で行ってください。ブラウザのキャッシュ削除や端末の故障によるデータ消失について、運営者は復旧の責任を負えません。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-slate-500" />
              4. 禁止事項
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>本アプリの複製、改変、リバースエンジニアリング</li>
              <li>本アプリを不正な目的で利用する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-xs text-center text-slate-400 mt-8">
          2025年1月3日 制定
        </div>

      </div>
    </PageLayout>
  );
}
