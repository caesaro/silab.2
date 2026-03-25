import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface AccessDeniedProps {
  onNavigate: (page: string) => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
      <div className="relative mb-6">
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-full animate-pulse"></div>
        
        {/* Main Icon */}
        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg border-2 border-red-100 dark:border-red-900">
          <ShieldAlert className="w-16 h-16 text-red-500 dark:text-red-400" />
        </div>
        
        {/* Badge Icon */}
        <div className="absolute -bottom-2 -right-2 bg-gray-900 dark:bg-gray-700 text-white p-1.5 rounded-full border-2 border-white dark:border-gray-800">
           <Lock className="w-4 h-4" />
        </div>
      </div>
      
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">403</h1>
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Akses Ditolak</h2>
      
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
        Maaf, Anda tidak memiliki izin untuk mengakses halaman ini. 
        Halaman ini terbatas hanya untuk role tertentu.
      </p>

      <button 
        onClick={() => onNavigate('dashboard')}
        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali ke Dashboard
      </button>
    </div>
  );
};

export default AccessDenied;
