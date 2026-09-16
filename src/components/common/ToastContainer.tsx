import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;

class ToastManager {
  private listeners: Set<ToastListener> = new Set();

  public subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public show(type: ToastMessage['type'], message: string, title?: string, duration = 4500) {
    const toast: ToastMessage = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      message,
      title,
      duration,
    };
    for (const listener of this.listeners) {
      listener(toast);
    }
  }

  public success(message: string, title?: string) {
    this.show('success', message, title);
  }

  public error(message: string, title?: string, duration = 6000) {
    this.show('error', message, title, duration);
  }

  public warning(message: string, title?: string, duration = 6000) {
    this.show('warning', message, title, duration);
  }

  public info(message: string, title?: string) {
    this.show('info', message, title);
  }
}

export const toast = new ToastManager();

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);
      if (newToast.duration) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    });
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((t) => {
        const bgColors = {
          success: 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100',
          error: 'bg-rose-950/95 border-rose-500/40 text-rose-100',
          warning: 'bg-amber-950/95 border-amber-500/40 text-amber-100',
          info: 'bg-slate-900/95 border-slate-700 text-slate-100',
        }[t.type];

        const iconColor = {
          success: 'text-emerald-400',
          error: 'text-rose-400',
          warning: 'text-amber-400',
          info: 'text-blue-400',
        }[t.type];

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${bgColors}`}
          >
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {t.type === 'warning' && <AlertCircle className="w-5 h-5" />}
              {t.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1 text-sm">
              {t.title && <h5 className="font-semibold text-white mb-0.5">{t.title}</h5>}
              <p className="leading-snug text-slate-200 text-xs sm:text-sm">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
