import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// ── Types ───────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ── Singleton for usage outside React components ────────────
let _showSuccess: ToastContextValue['showSuccess'] = () => {};
let _showError: ToastContextValue['showError'] = () => {};
let _showWarning: ToastContextValue['showWarning'] = () => {};
let _showInfo: ToastContextValue['showInfo'] = () => {};

export const toast = {
  success: (msg: string, dur?: number) => _showSuccess(msg, dur),
  error: (msg: string, dur?: number) => _showError(msg, dur),
  warning: (msg: string, dur?: number) => _showWarning(msg, dur),
  info: (msg: string, dur?: number) => _showInfo(msg, dur),
};

// ── Provider ────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${++counterRef.current}-${Date.now()}`;
    const dur = duration ?? (type === 'error' ? 6000 : type === 'warning' ? 5000 : 3500);
    setToasts(prev => [...prev, { id, type, message, duration: dur }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, dur);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg: string, dur?: number) => addToast('success', msg, dur), [addToast]);
  const showError = useCallback((msg: string, dur?: number) => addToast('error', msg, dur), [addToast]);
  const showWarning = useCallback((msg: string, dur?: number) => addToast('warning', msg, dur), [addToast]);
  const showInfo = useCallback((msg: string, dur?: number) => addToast('info', msg, dur), [addToast]);

  // Sync singleton helpers
  _showSuccess = showSuccess;
  _showError = showError;
  _showWarning = showWarning;
  _showInfo = showInfo;

  return (
    <ToastContext.Provider value={{ toasts, showSuccess, showError, showWarning, showInfo, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// ── Hook ────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ── Icons ───────────────────────────────────────────────────
const CheckIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const XCircleIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6" />
  </svg>
);
const WarnIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
  </svg>
);
const InfoIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const iconMap: Record<ToastType, React.FC> = {
  success: CheckIcon,
  error: XCircleIcon,
  warning: WarnIcon,
  info: InfoIcon,
};

const styleMap: Record<ToastType, string> = {
  success: 'bg-emerald-600/95 text-white border-emerald-400/30',
  error: 'bg-red-600/95 text-white border-red-400/30',
  warning: 'bg-amber-500/95 text-white border-amber-300/30',
  info: 'bg-sky-600/95 text-white border-sky-400/30',
};

// ── Single Toast ────────────────────────────────────────────
const ToastItem: React.FC<{ toast: Toast; dismiss: (id: string) => void }> = ({ toast: t, dismiss }) => {
  const Icon = iconMap[t.type];
  const [exiting, setExiting] = React.useState(false);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => dismiss(t.id), 250);
  };

  // Auto-exit animation before removal
  React.useEffect(() => {
    const timeout = setTimeout(() => setExiting(true), (t.duration ?? 3500) - 300);
    return () => clearTimeout(timeout);
  }, [t.duration]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl backdrop-blur-sm
        min-w-[280px] max-w-[420px] cursor-pointer select-none
        ${styleMap[t.type]}
        ${exiting ? 'animate-toast-exit' : 'animate-toast-enter'}
      `}
      onClick={handleDismiss}
      role="alert"
    >
      <Icon />
      <span className="text-sm font-medium leading-snug flex-1">{t.message}</span>
      <button
        onClick={e => { e.stopPropagation(); handleDismiss(); }}
        className="opacity-70 hover:opacity-100 transition-opacity p-0.5 -mr-1"
      >
        <CloseIcon />
      </button>
    </div>
  );
};

// ── Container (portal-like, fixed position) ─────────────────
const ToastContainer: React.FC<{ toasts: Toast[]; dismiss: (id: string) => void }> = ({ toasts, dismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} dismiss={dismiss} />
        </div>
      ))}
    </div>
  );
};
