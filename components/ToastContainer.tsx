import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  sticky?: boolean;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  useEffect(() => {
    toasts.forEach(toast => {
      if (!toast.sticky) {
        const timer = setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration || 5000);
        return () => clearTimeout(timer);
      }
    });
  }, [toasts]);

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertTriangle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getColors = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'bg-green-500 border-green-400 text-white';
      case 'error': return 'bg-red-500 border-red-400 text-white';
      case 'warning': return 'bg-yellow-500 border-yellow-400 text-white';
      default: return 'bg-blue-500 border-blue-400 text-white';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-10000 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`max-w-sm p-4 rounded-xl shadow-2xl border transform transition-all duration-300 animate-in slide-in-from-top-4 fade-in border-l-4 flex items-start gap-3 ${getColors(toast.type)}`}
        >
          <div className="shrink-0 mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-5 wrap-break-words">{toast.message}</p>
          </div>
          {!toast.sticky && (
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 ml-2 -mr-1 p-1 text-white/80 hover:text-white rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close toast"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

