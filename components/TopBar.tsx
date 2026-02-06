import React, { useState } from 'react';
import { Menu, Moon, Sun, Bell, Search, Sparkles, LogOut, User, ChevronDown, Check } from 'lucide-react';
import { Role, Notification } from '../types';

interface TopBarProps {
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentRole: Role;
  onOpenAi: () => void;
  onLogout: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onNavigate: (page: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onToggleSidebar, isDarkMode, toggleDarkMode, currentRole, onOpenAi, onLogout, notifications, onMarkAsRead, onNavigate
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 print:hidden">
      <div className="flex items-center">
        <button onClick={onToggleSidebar} className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden">
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Search Mockup */}
        <div className="hidden md:flex items-center ml-4 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3" />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 w-64 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* AI Assistant Button */}
        <button 
          onClick={onOpenAi}
          className="flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md hover:shadow-lg transition-all"
        >
          <Sparkles className="w-3 h-3 mr-1.5" />
          Ask AI
        </button>

        {/* Notifications */}
        <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
              )}
            </button>

            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsNotifOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-1 border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Notifikasi</p>
                    {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{unreadCount} Baru</span>}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center py-4 text-gray-500 text-sm">Tidak ada notifikasi.</p>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${!notif.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                           <div className="flex justify-between items-start">
                             <div className="flex-1">
                               <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{notif.title}</p>
                               <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.message}</p>
                               <p className="text-[10px] text-gray-400 mt-1">{notif.timestamp}</p>
                             </div>
                             {!notif.isRead && (
                               <button onClick={() => onMarkAsRead(notif.id)} className="text-blue-500 hover:text-blue-700 ml-2" title="Tandai sudah dibaca">
                                 <Check className="w-4 h-4" />
                               </button>
                             )}
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
        </div>

        <button onClick={toggleDarkMode} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
              <img src={`https://ui-avatars.com/api/?name=${currentRole}&background=0D8ABC&color=fff`} alt="Profile" />
            </div>
            <div className="hidden sm:block text-left">
               <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{currentRole}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
          </button>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 border border-gray-200 dark:border-gray-700 z-20">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-900 dark:text-white font-medium">Signed in as</p>
                  <p className="text-xs text-gray-500 truncate">{currentRole === Role.USER ? 'student@uksw.edu' : 'admin@uksw.edu'}</p>
                </div>
                <button 
                   onClick={() => {
                       onNavigate('profile');
                       setIsProfileOpen(false);
                   }}
                   className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                   <User className="w-4 h-4 mr-2" /> Profile
                </button>
                <button 
                  onClick={() => {
                      onLogout();
                      setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                >
                   <LogOut className="w-4 h-4 mr-2" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;