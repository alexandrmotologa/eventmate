import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export function useTelegram() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [user, setUser] = useState<{ id: number; firstName: string; username?: string } | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0) {
      setIsTelegram(true);
      tg.ready();
      tg.expand();

      if (tg.initDataUnsafe.user) {
        setUser({
          id: tg.initDataUnsafe.user.id,
          firstName: tg.initDataUnsafe.user.first_name,
          username: tg.initDataUnsafe.user.username,
        });
      }
    } else {
      // Standalone browser fallback
      setIsTelegram(false);
      setUser({
        id: 1001,
        firstName: 'Alex',
        username: 'alexmotologa',
      });
    }
  }, []);

  const hapticSelection = () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    } catch {
      // safe fallback
    }
  };

  const hapticSuccess = () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch {
      // safe fallback
    }
  };

  const hapticWarning = () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
    } catch {
      // safe fallback
    }
  };

  const closeApp = () => {
    try {
      window.Telegram?.WebApp?.close();
    } catch {
      window.close();
    }
  };

  return {
    isTelegram,
    user,
    tg: window.Telegram?.WebApp,
    hapticSelection,
    hapticSuccess,
    hapticWarning,
    closeApp,
  };
}
