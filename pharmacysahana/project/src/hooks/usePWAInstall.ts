import { useEffect, useState, useCallback } from 'react';

// TypeScript interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallState {
  canInstall: boolean;       // browser supports install (desktop/Android)
  isInstalled: boolean;      // already running as installed app
  isIOS: boolean;            // iOS Safari (needs Add to Home Screen)
  showInstallPrompt: () => Promise<void>;  // trigger install prompt
  openInBrowser: () => void; // open current URL in browser from standalone mode
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const iOS = /iphone|ipad|ipod/i.test(ua);
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsIOS(iOS);
    setIsInstalled(inStandalone);

    // Listen for install prompt (Chrome/Edge/Android)
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const showInstallPrompt = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const openInBrowser = useCallback(() => {
    const currentUrl = window.location.href;
    window.open(currentUrl, '_blank');
  }, []);

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    isIOS,
    showInstallPrompt,
    openInBrowser,
    deferredPrompt,
  };
}

