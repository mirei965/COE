'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setIsStandalone(isStandaloneMode ?? false);
    if (isStandaloneMode) return; // Don't show if already installed

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // If iOS and not standalone, show simple prompt (custom logic could be more complex, e.g. checking cookies to not show always)
    if (isIosDevice && !isStandaloneMode) {
      setShow(true);
    }

    // Android/Chrome event
    const handler = (e: Event) => {
      const installEvent = e as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show || isStandalone) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-3 px-4 relative z-50 lg:pl-64">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Coeをホーム画面に追加</p>
            {isIOS ? (
              <p className="opacity-90">
                iOS: Safariから
                <span className="font-bold border border-white/40 rounded px-1 mx-1"><Share className="inline h-3 w-3" />共有</span>
                で「ホーム画面に追加」
              </p>
            ) : (
              <p className="opacity-90">アプリとしてインストールできます</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isIOS && deferredPrompt && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-white text-indigo-600 hover:bg-white/90 font-bold h-7 text-xs px-3 rounded-full"
            >
              インストール
            </Button>
          )}
          <button onClick={() => setShow(false)} className="p-1 hover:bg-white/20 rounded-full">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
