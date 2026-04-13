import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
  isDarkMode?: boolean;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast, isDarkMode }) => {
  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
        .animate-slide-out {
          animation: slideOut 0.3s ease-in forwards;
        }
        .animate-progress {
          animation: progress 5s linear forwards;
        }
        .toast-item:hover .animate-progress {
          animation-play-state: paused;
        }
      `}</style>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} removeToast={removeToast} isDarkMode={isDarkMode} />
        ))}
      </div>
    </>
  );
};

const ToastItem = ({ toast, removeToast, isDarkMode }: { toast: ToastMessage; removeToast: (id: string) => void; isDarkMode?: boolean }) => {
  const [isExiting, setIsExiting] = useState(false);

  // Hapus dari state setelah animasi selesai
  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, 300); // Sesuai durasi animasi (0.3s)
      return () => clearTimeout(timer);
    }
  }, [isExiting, toast.id, removeToast]);

  const icons = {
    success: <CheckCircle className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />,
    error: <AlertCircle className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />,
    info: <Info className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />,
    warning: <AlertTriangle className={`w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />,
  };

  const styles = isDarkMode ? {
    success: 'bg-green-900/80 border-green-700 text-green-100',
    error: 'bg-red-900/80 border-red-700 text-red-100',
    info: 'bg-blue-900/80 border-blue-700 text-blue-100',
    warning: 'bg-yellow-900/80 border-yellow-700 text-yellow-100',
  } : {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  return (
    <div 
      className={`
        toast-item
        pointer-events-auto flex items-start p-4 rounded-lg border shadow-lg 
        transition-all duration-300 min-w-75 max-w-md relative overflow-hidden
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
        ${styles[toast.type]}
      `}
    >
      <div className="shrink-0 mr-3 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 text-sm font-medium wrap-break-words">
        {toast.message}
      </div>
      <button
        onClick={() => setIsExiting(true)}
        className={`ml-3 transition-colors focus:outline-none ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
      {!toast.sticky && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-current opacity-40 animate-progress" 
          onAnimationEnd={() => setIsExiting(true)}
        />
      )}
    </div>
  );
};

export default Toast;