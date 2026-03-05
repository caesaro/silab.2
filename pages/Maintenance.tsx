import React from 'react';
import { Construction, RefreshCw } from 'lucide-react';

const Maintenance: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-center p-6 font-sans">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction className="w-10 h-10 text-yellow-600 dark:text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Sistem Sedang Dalam Perbaikan</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Mohon maaf, kami sedang melakukan pemeliharaan rutin untuk meningkatkan performa sistem. 
          Silakan coba akses kembali beberapa saat lagi.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="flex items-center justify-center w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
        </button>
      </div>
      <p className="mt-8 text-sm text-gray-400">CORE.FTI &copy; {new Date().getFullYear()}</p>
    </div>
  );
};

export default Maintenance;