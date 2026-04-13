import React, { useState, useEffect } from 'react';
import { Menu, Moon, Sun, Bell, Search, LogOut, User, ChevronDown, Check, Box, MapPin, CheckCheck, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Role, Notification } from '../types';
import { api } from '../services/api';

interface TopBarProps {
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentRole: Role;
  userName: string;
  onOpenAi: () => void;
  onLogout: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAllNotifications: () => void;
  onNavigate: (page: string) => void;
  isMaintenanceMode?: boolean;
}

// 1. Definisikan interface untuk hasil pencarian
interface SearchResult {
  name: string;
  page: string;
  icon: string;
  status?: string;
  type: string;
}

// 2. Pindahkan iconMap keluar komponen (Static lookup)
const iconMap: Record<string, React.ElementType> = {
  User: User,
  Room: MapPin, // Backend sends 'Room', map to MapPin icon
  MapPin: MapPin,
  Inventory: Box,
  Box: Box
};

const TopBar: React.FC<TopBarProps> = ({ 
  onToggleSidebar, isDarkMode, toggleDarkMode, currentRole, userName, onOpenAi, onLogout, notifications, onMarkAsRead, onMarkAllAsRead, onClearAllNotifications, onNavigate, isMaintenanceMode
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [visibleNotifCount, setVisibleNotifCount] = useState(10);
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  // 3. Gunakan tipe data yang eksplisit
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Debounce Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const res = await api(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            setSearchResults(await res.json());
            setIsSearchOpen(true);
          }
        } catch (e) {
          console.error("Search error", e);
        }
      } else {
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    }, 500); // Tunggu 500ms setelah user berhenti mengetik

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // (Deleted internal iconMap)

  const handleResultClick = (page: string) => {
    onNavigate(page);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'unread') return !n.isRead;
    return true;
  });

  // Reset infinite scroll saat filter berubah atau dropdown dibuka
  useEffect(() => {
    if (isNotifOpen) {
      setVisibleNotifCount(10);
    }
  }, [isNotifOpen, notifFilter]);

  // Handler untuk Infinite Scroll
  const handleNotifScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Jika scroll sudah mendekati bawah (threshold 10px)
    if (scrollHeight - scrollTop <= clientHeight + 10) {
      if (visibleNotifCount < filteredNotifications.length) {
        setVisibleNotifCount(prev => prev + 5);
      }
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 print:hidden">
      <div className="flex items-center">
        <button 
          onClick={onToggleSidebar} 
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Global Search */}
        <div className="hidden md:flex items-center ml-4 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3" />
          <input 
            type="text"
            placeholder="Cari User, Ruangan, Barang..." 
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => searchQuery.length > 1 && setIsSearchOpen(true)}
            className="pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 w-64 transition-all"
          />
          
          {/* Search Results Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)}></div>
              <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fade-in-up">
                 <div className="py-2">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">Hasil Pencarian</p>
                    {searchResults.map((result, idx) => {
                      const IconComponent = iconMap[result.icon] || Search;
                      return (
                      <button 
                        key={idx}
                        onClick={() => handleResultClick(result.page)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center group border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                         <IconComponent className="w-4 h-4 text-gray-400 mr-3 group-hover:text-blue-500" />
                         <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600">{result.name}</p>
                                {result.status && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                        result.status === 'Tersedia' || result.status === 'Aktif' 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>{result.status}</span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">{result.type}</p>
                         </div>
                      </button>
                    );
                    })}
                 </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">

        {isMaintenanceMode && (
          <div className="hidden sm:flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-bold animate-pulse border border-red-200 dark:border-red-800" title="Maintenance Mode Sedang Aktif">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Maintenance
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full relative"
              aria-label="Notifications"
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
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Notifikasi</p>
                        {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{unreadCount}</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                          <button onClick={onMarkAllAsRead} className="text-xs flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" title="Tandai semua sudah dibaca">
                            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Read All
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={onClearAllNotifications} className="text-xs flex items-center text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors" title="Hapus semua notifikasi">
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <button onClick={() => setNotifFilter('all')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${notifFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        Semua
                      </button>
                      <button onClick={() => setNotifFilter('unread')} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${notifFilter === 'unread' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        Belum Dibaca
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto" onScroll={handleNotifScroll}>
                    {filteredNotifications.length === 0 ? (
                      <p className="text-center py-8 text-gray-500 text-sm">Tidak ada notifikasi {notifFilter === 'unread' ? 'baru' : ''}.</p>
                    ) : (
                      filteredNotifications.slice(0, visibleNotifCount).map(notif => (
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
                    {visibleNotifCount < filteredNotifications.length && (
                      <div className="py-3 text-center flex justify-center items-center text-gray-400 border-t border-gray-100 dark:border-gray-700">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
        </div>

        <button 
          onClick={toggleDarkMode} 
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="User Menu"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`} alt="Profile" />
            </div>
            <div className="hidden sm:block text-left">
               <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{userName}</p>
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
                   onNavigate('profil');
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
