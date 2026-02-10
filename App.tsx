import React, { useState, useEffect } from 'react';
import { Role, Notification, ToastMessage } from './types';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Schedule from './pages/Schedule'; 
import Equipment from './pages/Equipment';
import LaboranManagement from './pages/LaboranManagement';
import Inventory from './pages/Inventory';
import UserManagement from './pages/UserManagement';
import ManageBookings from './pages/ManageBookings';
import MyBookings from './pages/MyBookings'; 
import Profile from './pages/Profile'; 
import Settings from './pages/Settings';
import Login from './pages/Login';
import Toast from './components/Toast';
import LoadingScreen from './components/LoadingScreen';
import { MOCK_ROOMS, MOCK_EQUIPMENT, MOCK_NOTIFICATIONS } from './services/mockData';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('isAuthenticated') === 'true');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentRole, setCurrentRole] = useState<Role>(() => (localStorage.getItem('currentRole') as Role) || Role.USER);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  // Notifications & Toast State
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Simulate Initial System Load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2 seconds initial load
    return () => clearTimeout(timer);
  }, []);

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

  const handleLogin = (role: Role) => {
    setIsLoading(true); // Show loader during login transition
    
    // Simulate API delay
    setTimeout(() => {
      setCurrentRole(role);
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
      setIsLoading(false); // Hide loader
      showToast(`Selamat datang kembali, ${role}!`, 'success');
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('currentRole', role);
    }, 1500);
  };

  const handleLogout = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsAuthenticated(false);
      setCurrentRole(Role.USER);
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('currentRole');
      setIsLoading(false);
    }, 800);
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

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  // Helper: Show Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const newToast: ToastMessage = {
       id: Date.now().toString(),
       message,
       type
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };


  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard role={currentRole} />;
      case 'schedule':
        return <Schedule role={currentRole} showToast={showToast} isDarkMode={isDarkMode} />;
      case 'rooms':
        return <Rooms role={currentRole} isDarkMode={isDarkMode} />;
      case 'equipment':
        // Double check protection (though Sidebar hides it)
        if (currentRole === Role.USER) return <Dashboard role={currentRole} />;
        return <Equipment role={currentRole} showToast={showToast} />;
      case 'laboran-management':
        if (currentRole !== Role.ADMIN) return <Dashboard role={currentRole} />;
        return <LaboranManagement />;
      case 'inventory':
        if (currentRole === Role.USER) return <Dashboard role={currentRole} />;
        return <Inventory />;
      case 'users':
        if (currentRole !== Role.ADMIN) return <Dashboard role={currentRole} />;
        return <UserManagement />;
      case 'bookings':
        // Passing John Doe's ID for demo purposes to match mock data
        return <MyBookings userId="672019001" showToast={showToast} />;
      case 'manage-bookings':
        return <ManageBookings addNotification={addNotification} showToast={showToast} />;
      case 'profile':
        return <Profile role={currentRole} />;
      case 'settings':
        if (currentRole !== Role.ADMIN) return <Dashboard role={currentRole} />;
        return <Settings showToast={showToast} />;
      default:
        return <Dashboard role={currentRole} />;
    }
  };

  // Render Global Loader
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} transition-colors duration-200 font-sans`}>
        <Login 
          onLogin={handleLogin} 
          showToast={showToast} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode}
        />
        {/* Allow toasts even on login screen */}
        <Toast toasts={toasts} removeToast={removeToast} />
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
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:h-auto print:block">
          <TopBar 
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            currentRole={currentRole}
            onOpenAi={() => showToast("Fitur AI dinonaktifkan.", "info")}
            onLogout={handleLogout}
            notifications={notifications}
            onMarkAsRead={markNotificationAsRead}
            onNavigate={(page) => setCurrentPage(page)}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:overflow-visible print:h-auto print:p-0 print:block flex flex-col">
            <div className="flex-1">{renderPage()}</div>
            <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400 print:hidden">
              CORE.FTI - Campus Operational Resource Environment &copy; {new Date().getFullYear()} FTI UKSW. All rights reserved.
            </footer>
          </main>
        </div>
      </div>

      
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default App;