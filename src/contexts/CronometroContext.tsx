import React, { createContext, useContext, useState, useCallback, useEffect, useRef, memo } from 'react';
import { useCulto } from '@/contexts/CultoContext';

interface CronometroContextType {
  timeAdjustment: number;
  addTime: (seconds: number) => void;
  resetAdjustment: () => void;
  isBlinking: boolean;
  toggleBlink: () => void;
  setBlinking: (value: boolean) => void;
  message: string;
  setMessage: (msg: string) => void;
  showMessage: boolean;
  setShowMessage: (value: boolean) => void;
  orangeThreshold: number;
  redThreshold: number;
  setOrangeThreshold: (seconds: number) => void;
  setRedThreshold: (seconds: number) => void;
  topFontSize: number;
  bottomFontSize: number;
  timerFontSize: number;
  messageFontSize: number;
  backgroundColor: string;
  timerTextColor: string;
  topTextColor: string;
  bottomTextColor: string;
  messageTextColor: string;
  warningColor: string;
  dangerColor: string;
  setTopFontSize: (size: number) => void;
  setBottomFontSize: (size: number) => void;
  setTimerFontSize: (size: number) => void;
  setMessageFontSize: (size: number) => void;
  setBackgroundColor: (color: string) => void;
  setTimerTextColor: (color: string) => void;
  setTopTextColor: (color: string) => void;
  setBottomTextColor: (color: string) => void;
  setMessageTextColor: (color: string) => void;
  setWarningColor: (color: string) => void;
  setDangerColor: (color: string) => void;
}

const STORAGE_KEY = 'culto-ao-vivo:cronometro-settings';

const defaultSettings = {
  orangeThreshold: 120,
  redThreshold: 20,
  topFontSize: 4,
  bottomFontSize: 2.75,
  timerFontSize: 28,
  messageFontSize: 16,
  backgroundColor: '#000000',
  timerTextColor: '#ffffff',
  topTextColor: '#b8c0d4',
  bottomTextColor: '#99a2b3',
  messageTextColor: '#ffffff',
  warningColor: '#f59e0b',
  dangerColor: '#ef4444',
};

const isValidHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

const readStoredState = () => {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<typeof defaultSettings>;
    return {
      orangeThreshold: typeof parsed.orangeThreshold === 'number' ? Math.max(10, Math.min(600, parsed.orangeThreshold)) : defaultSettings.orangeThreshold,
      redThreshold: typeof parsed.redThreshold === 'number' ? Math.max(5, Math.min(300, parsed.redThreshold)) : defaultSettings.redThreshold,
      topFontSize: typeof parsed.topFontSize === 'number' ? Math.max(1.25, Math.min(8, parsed.topFontSize)) : defaultSettings.topFontSize,
      bottomFontSize: typeof parsed.bottomFontSize === 'number' ? Math.max(1, Math.min(6, parsed.bottomFontSize)) : defaultSettings.bottomFontSize,
      timerFontSize: typeof parsed.timerFontSize === 'number' ? Math.max(6, Math.min(40, parsed.timerFontSize)) : defaultSettings.timerFontSize,
      messageFontSize: typeof parsed.messageFontSize === 'number' ? Math.max(2, Math.min(24, parsed.messageFontSize)) : defaultSettings.messageFontSize,
      backgroundColor: isValidHexColor(parsed.backgroundColor || '') ? parsed.backgroundColor! : defaultSettings.backgroundColor,
      timerTextColor: isValidHexColor(parsed.timerTextColor || '') ? parsed.timerTextColor! : defaultSettings.timerTextColor,
      topTextColor: isValidHexColor(parsed.topTextColor || '') ? parsed.topTextColor! : defaultSettings.topTextColor,
      bottomTextColor: isValidHexColor(parsed.bottomTextColor || '') ? parsed.bottomTextColor! : defaultSettings.bottomTextColor,
      messageTextColor: isValidHexColor(parsed.messageTextColor || '') ? parsed.messageTextColor! : defaultSettings.messageTextColor,
      warningColor: isValidHexColor(parsed.warningColor || '') ? parsed.warningColor! : defaultSettings.warningColor,
      dangerColor: isValidHexColor(parsed.dangerColor || '') ? parsed.dangerColor! : defaultSettings.dangerColor,
    };
  } catch (error) {
    console.error('Falha ao ler configuracoes do cronometro:', error);
    return defaultSettings;
  }
};

const CronometroContext = createContext<CronometroContextType | null>(null);

export const CronometroProvider: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const { isBlinking, toggleBlink, setBlinking, syncMessage, setSyncMessage, syncShowMessage, setSyncShowMessage } = useCulto();
  const [timeAdjustment, setTimeAdjustment] = useState(0);
  const [state, setState] = useState(readStoredState);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 80);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [state]);

  const updateState = useCallback((patch: Partial<typeof defaultSettings>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const addTime = useCallback((seconds: number) => setTimeAdjustment((prev) => prev + seconds), []);
  const resetAdjustment = useCallback(() => setTimeAdjustment(0), []);

  const value = React.useMemo<CronometroContextType>(() => ({
    timeAdjustment,
    addTime,
    resetAdjustment,
    isBlinking,
    toggleBlink,
    setBlinking,
    message: syncMessage,
    setMessage: setSyncMessage,
    showMessage: syncShowMessage,
    setShowMessage: setSyncShowMessage,
    orangeThreshold: state.orangeThreshold,
    redThreshold: state.redThreshold,
    setOrangeThreshold: (s: number) => updateState({ orangeThreshold: s }),
    setRedThreshold: (s: number) => updateState({ redThreshold: s }),
    topFontSize: state.topFontSize,
    bottomFontSize: state.bottomFontSize,
    timerFontSize: state.timerFontSize,
    messageFontSize: state.messageFontSize,
    backgroundColor: state.backgroundColor,
    timerTextColor: state.timerTextColor,
    topTextColor: state.topTextColor,
    bottomTextColor: state.bottomTextColor,
    messageTextColor: state.messageTextColor,
    warningColor: state.warningColor,
    dangerColor: state.dangerColor,
    setTopFontSize: (s: number) => updateState({ topFontSize: s }),
    setBottomFontSize: (s: number) => updateState({ bottomFontSize: s }),
    setTimerFontSize: (s: number) => updateState({ timerFontSize: s }),
    setMessageFontSize: (s: number) => updateState({ messageFontSize: s }),
    setBackgroundColor: (c: string) => updateState({ backgroundColor: c }),
    setTimerTextColor: (c: string) => updateState({ timerTextColor: c }),
    setTopTextColor: (c: string) => updateState({ topTextColor: c }),
    setBottomTextColor: (c: string) => updateState({ bottomTextColor: c }),
    setMessageTextColor: (c: string) => updateState({ messageTextColor: c }),
    setWarningColor: (c: string) => updateState({ warningColor: c }),
    setDangerColor: (c: string) => updateState({ dangerColor: c }),
  }), [timeAdjustment, addTime, resetAdjustment, isBlinking, toggleBlink, setBlinking, syncMessage, setSyncMessage, syncShowMessage, setSyncShowMessage, state, updateState]);

  return <CronometroContext.Provider value={value}>{children}</CronometroContext.Provider>;
});

CronometroProvider.displayName = 'CronometroProvider';

export const useCronometro = () => {
  const ctx = useContext(CronometroContext);
  if (!ctx) throw new Error('useCronometro must be used within CronometroProvider');
  return ctx;
};
