import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Role, Notification, ToastMessage } from './types';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toast from './components/Toast';
import LoadingScreen from './components/LoadingScreen';
import ProtectedRoute from './components/ProtectedRoute';
import { api } from './services/api';

// Lazy load all pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Ruangan = lazy(() => import('./pages/Ruangan'));
const JadwalRuang = lazy(() => import('./pages/JadwalRuang'));
const PeminjamanBarang = lazy(() => import('./pages/PeminjamanBarang'));
const Acara = lazy(() => import('./pages/Acara'));
const ManajemenLaboran = lazy(() => import('./pages/ManajemenLaboran'));
const ManajemenPKL = lazy(() => import('./pages/ManajemenPKL'));
const Inventaris = lazy(() => import('./pages/Inventaris'));
const PerpindahanBarang = lazy(() => import('./pages/PerpindahanBarang'));
const ManajemenUser = lazy(() => import('./pages/ManajemenUser'));
const PesananRuang = lazy(() => import('./pages/PesananRuang'));
const PemesananSaya = lazy(() => import('./pages/PemesananSaya'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const JadwalKuliah = lazy(() => import('./pages/JadwalKuliah'));
const ManajemenSpesifikasi = lazy(() => import('./pages/ManajemenSpesifikasi'));
const Tentang = lazy(() => import('./pages/Tentang'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('isAuthenticated') === 'true');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentRole, setCurrentRole] = useState<Role>(() => (localStorage.getItem('currentRole') as Role) || ('User' as Role));
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('userName') || 'User');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('isSidebarCollapsed');
    return saved === 'true';
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Notifications & Toast State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Simulate Initial System Load
  useEffect(() => {
    // Cek status maintenance dari server
    const checkSystemStatus = async () => {
      try {
        const res = await api('/api/settings/maintenance');
        if (res.ok) {
          const data = await res.json();
          setIsMaintenanceMode(data.enabled);
        }
      } catch (e) {
        console.error("Gagal cek status maintenance", e);
        // Non-blocking: lanjutkan meskipun gagal
        setIsMaintenanceMode(false);
      }
    };
    checkSystemStatus();

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // Reduced from 2000ms to 1500ms for faster initial render

    // Fetch Notifications
    const fetchNotifications = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await api('/api/notifications');
        if (res.ok) setNotifications(await res.json());
      } catch (e) {
        console.error("Gagal mengambil notifikasi", e);
      }
    };

    let notifInterval: NodeJS.Timeout;
    if (isAuthenticated) {
      fetchNotifications(); // Ambil langsung saat load
      notifInterval = setInterval(fetchNotifications, 10000); // Cek lagi setiap 10 detik
    }

    return () => {
      clearTimeout(timer);
      if (notifInterval) clearInterval(notifInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Changed dependency to empty array - only run once on mount

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('isDarkMode', String(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('isSidebarCollapsed', String(newState));
  };

  const handleLogin = (role: Role, userNameFromLogin?: string) => {
    setIsLoading(true);
    setCurrentRole(role);
    
    // Use userName from parameter if provided, otherwise get from localStorage
    // This fixes the race condition where localStorage wasn't set yet
    const userName = userNameFromLogin || localStorage.getItem('userName') || 'User';
    setUserName(userName);
    
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    showToast('Selamat datang kembali!', 'success');
    
    // Save to localStorage synchronously to ensure persistence
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('currentRole', role);
    localStorage.setItem('userName', userName);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Beri tahu backend untuk menghapus token dari database
      await api('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error("Gagal menghubungi server untuk logout, melanjutkan logout di sisi klien.", error);
    } finally {
      // Selalu bersihkan data di client, apapun hasil dari server
      setIsAuthenticated(false);
      setCurrentRole('User' as Role);
      setUserName('User');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('currentRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      setIsLoading(false);
    }
  };

  // Helper: Add Notification
  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      timestamp: 'Baru saja',
      isRead: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await api(`/api/notifications/${id}/read`, { method: 'PUT' });
    } catch (e) { console.error(e); }
    
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsAsRead = async () => {
    try {
      // Optimistic update di UI
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Hit endpoint (asumsi backend mendukung)
      await api(`/api/notifications/read-all`, { method: 'PUT' });
    } catch (e) { console.error("Gagal mark all read", e); }
  };

  const clearAllNotifications = async () => {
    try {
      // Optimistic update
      setNotifications([]);
      await api('/api/notifications', { method: 'DELETE' });
      showToast('Semua notifikasi berhasil dihapus.', 'success');
    } catch (e) { console.error("Gagal hapus notifikasi", e); }
  };

  // Helper: Show Toast
  const showToast = (message: string | React.ReactNode, type: 'success' | 'error' | 'info' | 'warning' = 'info', sticky: boolean = false) => {
    const newToast: any = {
       id: Date.now().toString() + Math.random().toString(),
       message,
       type,
       sticky
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- SESSION TIMEOUT (AUTO LOGOUT) ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const TIMEOUT_MS = 60 * 60 * 1000; // 60 Menit (1 Jam)
    let timeoutId: NodeJS.Timeout;

    const triggerLogout = () => {
      showToast("Sesi Anda berakhir karena tidak aktif selama 1 jam.", "warning");
      handleLogout();
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(triggerLogout, TIMEOUT_MS);
    };

    // Daftar event aktivitas user yang akan mereset timer
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    // Pasang event listener
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    // Mulai timer awal
    resetTimer();

    // Bersihkan saat unmount atau logout
    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);


  const renderPage = () => {
    const pageContent = (() => {
      switch (currentPage) {
        case 'dashboard':
          return <Dashboard role={currentRole} onNavigate={setCurrentPage} />;
        case 'schedule':
          return <JadwalRuang role={currentRole} showToast={showToast} isDarkMode={isDarkMode} />;
        case 'rooms':
          return <Ruangan role={currentRole} isDarkMode={isDarkMode} onNavigate={setCurrentPage} showToast={showToast} />;
        case 'events':
          return <Acara showToast={showToast} isDarkMode={isDarkMode} />;
        case 'loans':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN, Role.LABORAN]} 
              onNavigate={setCurrentPage}
            >
              <PeminjamanBarang role={currentRole} showToast={showToast} />
            </ProtectedRoute>
          );
        case 'laboran-management':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN]} 
              onNavigate={setCurrentPage}
            >
              <ManajemenLaboran onNavigate={setCurrentPage} showToast={showToast} />
            </ProtectedRoute>
          );
        case 'pkl-management':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN, Role.LABORAN]} 
              onNavigate={setCurrentPage}
            >
              <ManajemenPKL showToast={showToast} />
            </ProtectedRoute>
          );
        case 'inventory':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN, Role.LABORAN]} 
              onNavigate={setCurrentPage}
            >
              <Inventaris showToast={showToast} />
            </ProtectedRoute>
          );
        case 'item-movements':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN, Role.LABORAN]} 
              onNavigate={setCurrentPage}
            >
              <PerpindahanBarang role={currentRole} showToast={showToast} />
            </ProtectedRoute>
          );
        case 'users':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN]} 
              onNavigate={setCurrentPage}
            >
              <ManajemenUser showToast={showToast} />
            </ProtectedRoute>
          );
        case 'bookings':
          // Get dynamic user ID from localStorage
          const currentUserId = localStorage.getItem('userId') || '';
          return <PemesananSaya userId={currentUserId} showToast={showToast} />;
        case 'manage-bookings':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN, Role.LABORAN]} 
              onNavigate={setCurrentPage}
            >
              <PesananRuang addNotification={addNotification} showToast={showToast} />
            </ProtectedRoute>
          );
        case 'profile':
          return <Profile role={currentRole} showToast={showToast} />;
case 'settings':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN]} 
              onNavigate={setCurrentPage}
            >
              <Settings showToast={showToast} onNavigate={setCurrentPage} />
            </ProtectedRoute>
          );
        case 'class-schedule':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN, Role.LABORAN]} 
              onNavigate={setCurrentPage}
            >
              <JadwalKuliah role={currentRole} showToast={showToast} />
            </ProtectedRoute>
          );
case 'specs-management':
          return (
            <ProtectedRoute 
              currentRole={currentRole} 
              allowedRoles={[Role.ADMIN, Role.LABORAN]} 
              onNavigate={setCurrentPage}
            >
              <ManajemenSpesifikasi role={currentRole} isDarkMode={isDarkMode} showToast={showToast} />
            </ProtectedRoute>
          );
        case 'tentang':
          return <Tentang />;
        default:
          return <Dashboard role={currentRole} onNavigate={setCurrentPage} />;
      }
    })();

    // Wrap with Suspense for lazy loading
    return <Suspense fallback={<PageLoader />}>{pageContent}</Suspense>;
  };

  // Render Global Loader
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Render Maintenance Screen (Hanya untuk User biasa, Admin/Laboran tetap bisa akses)
  if (isMaintenanceMode && currentRole === Role.USER) {
    return <Maintenance />;
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} transition-colors duration-200 font-sans`}>
        <Suspense fallback={<LoadingScreen />}>
          <Login 
            onLogin={handleLogin} 
            showToast={showToast} 
            isDarkMode={isDarkMode} 
            toggleDarkMode={toggleDarkMode}
          />
        </Suspense>
        {/* Allow toasts even on login screen */}
        <Toast toasts={toasts} removeToast={removeToast} isDarkMode={isDarkMode} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 font-sans print:bg-white`}>
      <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden print:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar 
          currentRole={currentRole}
          currentPage={currentPage}
          onNavigate={(page) => {
            setCurrentPage(page);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:h-auto print:block">
          <TopBar 
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            currentRole={currentRole}
            userName={userName}
            onOpenAi={() => showToast("Fitur AI dinonaktifkan.", "info")}
            onLogout={handleLogout}
            notifications={notifications}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            onClearAllNotifications={clearAllNotifications}
            onNavigate={(page) => setCurrentPage(page)}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:overflow-visible print:h-auto print:p-0 print:block flex flex-col">
            <div className="flex-1">{renderPage()}</div>
            <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400 print:hidden">
              Campus Operational Resource Environment &copy; {new Date().getFullYear()} Sarana dan Prasarana FTI UKSW. All rights reserved.
            </footer>
          </main>
        </div>
      </div>

      
      
      <Toast toasts={toasts} removeToast={removeToast} isDarkMode={isDarkMode} />
    </div>
  );
};

export default App;