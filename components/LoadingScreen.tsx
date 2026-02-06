import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      <div className="relative flex items-center justify-center mb-8">
        {/* Decorative Background Blur */}
        <div className="absolute w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>

        {/* Outer Ring */}
        <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-900/50 rounded-full"></div>
        
        {/* Spinning Arc */}
        <div className="absolute w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        
        {/* Center Logo */}
        <div className="absolute flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-600/30 animate-pulse">
           <span className="text-xl font-bold text-white">F</span>
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">SILAB FTI</h2>
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-widest mt-2">
          Universitas Kristen Satya Wacana
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;