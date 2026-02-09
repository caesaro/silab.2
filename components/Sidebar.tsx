import React from 'react';
import { LayoutDashboard, Calendar, Box, Monitor, Users, FileText, Settings, Shield, Wrench, CalendarRange } from 'lucide-react';
import { Role } from '../types';
import nocLogo from "../src/assets/noc.png"; 

interface SidebarProps {
  currentRole: Role;
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentRole, currentPage, onNavigate, isOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.ADMIN, Role.LABORAN, Role.USER] },
    { id: 'schedule', label: 'Jadwal Lab', icon: CalendarRange, roles: [Role.ADMIN, Role.LABORAN, Role.USER] },
    { id: 'rooms', label: 'Daftar Ruangan', icon: Calendar, roles: [Role.ADMIN, Role.LABORAN, Role.USER] },
    { id: 'bookings', label: 'Pemesanan Saya', icon: FileText, roles: [Role.USER] },
    { id: 'manage-bookings', label: 'Verifikasi Pesanan', icon: FileText, roles: [Role.ADMIN, Role.LABORAN] },
    { id: 'laboran-management', label: 'Manajemen Laboran', icon: Wrench, roles: [Role.ADMIN] },
    { id: 'equipment', label: 'Peminjaman Barang', icon: Box, roles: [Role.ADMIN, Role.LABORAN] },
    { id: 'inventory', label: 'Inventaris', icon: Monitor, roles: [Role.ADMIN, Role.LABORAN] },
    { id: 'users', label: 'Manajemen User', icon: Users, roles: [Role.ADMIN] },
    { id: 'settings', label: 'Pengaturan', icon: Settings, roles: [Role.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(currentRole));

  return (
    <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 z-40 w-64 h-screen transition-transform duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 print:hidden`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
        <div className="flex items-center justify-center"></div>
        <img
          src={nocLogo}
          alt="NOC Logo"
          className="w-10 h-10 object-contain"
        />
        <span className="text-xl font-bold text-gray-800 dark:text-white">SILAB FTI</span>
      </div>

      <div className="p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Menu</div>
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center px-2 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Shield className="w-8 h-8 text-blue-600 p-1.5 bg-blue-100 rounded-full mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Role Saat Ini</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{currentRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;