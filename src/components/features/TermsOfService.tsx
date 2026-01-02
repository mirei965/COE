'use client';

import * as React from 'react';
import { useSetting } from '@/hooks/useSettings';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ScrollText, CheckCircle2 } from 'lucide-react';

export function TermsOfService() {
  const { value: accepted, setValue: setAccepted, isLoading } = useSetting('tos_accepted', false);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && !accepted) {
      setIsVisible(true);
    }
  }, [isLoading, accepted]);

  if (!isVisible) return null;

  const handleAccept = async () => {
    await setAccepted(true);
    setIsVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand-400 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl" />
          </div>
          <ShieldCheck className="h-16 w-16 text-white drop-shadow-lg" />
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic tracking-tight flex items-center justify-center gap-2">
              <ScrollText className="h-6 w-6 text-brand-500" />
              利用規約への同意
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              サービスを安心・安全にご利用いただくために、<br />以下の内容をご確認ください。
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 max-h-[30vh] overflow-y-auto border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-4 font-sans antialiased">
            <section>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">第1条（目的）</h3>
              <p>本規約は、本アプリケーション（以下「本アプリ」）が提供する健康管理サポートサービス（以下「本サービス」）の利用条件を定めるものです。</p>
            </section>
            <section>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">第2条（データの取り扱い）</h3>
              <p>1. 本アプリに入力されるデータ（症状、服薬、メモ等）は、お客様の端末内およびお客様が許可したクラウド環境にのみ保存されます。<br />
                2. 当社は、お客様の許可なく個人を特定できる情報を収集することはありません。</p>
            </section>
            <section>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">第3条（免責事項）</h3>
              <p>1. 本サービスは医療行為を代替するものではありません。緊急時や症状の悪化を感じた場合は、直ちに医療機関を受診してください。<br />
                2. 本サービスの利用によって生じた損害について、当社は一切の責任を負いかねます。</p>
            </section>
            <section>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">第4条（禁止事項）</h3>
              <p>本サービスの解析、改ざん、または他の利用者の迷惑となる行為を禁止します。</p>
            </section>
            <p className="text-[10px] text-center opacity-50 pt-4">— coe 開発チームより —</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/50">
              <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                利用規約およびプライバシーポリシーに同意し、サービスの利用を開始します。データはプライバシー保護に細心の注意を払って取り扱われます。
              </p>
            </div>

            <Button
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all bg-brand-500 hover:bg-brand-600 text-white"
              onClick={handleAccept}
            >
              同意してはじめる
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
