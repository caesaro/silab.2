import React, { useState } from 'react';
import { LayoutDashboard, Calendar, Box, Monitor, Users, FileText, Settings, Shield, Wrench, CalendarRange, PlusCircle, CalendarDays, GraduationCap, ArrowRightLeft, BookOpen, Cpu, Info, ChevronLeft, ChevronRight, DoorOpen, ClipboardList, ClipboardCheck, Archive, ChevronDown } from 'lucide-react';
import { Role } from '../types';
import nocLogo from "../src/assets/NOC.svg"; 

interface SidebarProps {
  currentRole: Role;
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentRole, currentPage, onNavigate, isOpen, isCollapsed = false, onToggleCollapse }) => {
  const [hoveredItem, setHoveredItem] = useState<{ label: string; top: number } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const mainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.ADMIN, Role.LABORAN, Role.USER, 'Supervisor' as Role] },
    { id: 'rooms', label: 'Daftar Ruangan', icon: DoorOpen, roles: [Role.ADMIN, Role.LABORAN, Role.USER, 'Supervisor' as Role] },
    { id: 'manage-bookings', label: 'Pesanan Ruang', icon: ClipboardCheck, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
    { id: 'inventory', label: 'Inventaris', icon: Archive, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
    { id: 'bookings', label: 'Pemesanan Saya', icon: ClipboardList, roles: [Role.USER] },
  ];

  const menuGroups = [
    {
      id: 'jadwal',
      title: 'Jadwal',
      items: [
      { id: 'schedule', label: 'Jadwal Ruang', icon: CalendarRange, roles: [Role.ADMIN, Role.LABORAN, Role.USER, 'Supervisor' as Role] },
      { id: 'class-schedule', label: 'Jadwal Kuliah', icon: BookOpen, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
      { id: 'events', label: 'Acara', icon: CalendarDays, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
      ]
    },
    {
      id: 'manajemen',
      title: 'Manajemen',
      items: [
        { id: 'users', label: 'Manajemen User', icon: Users, roles: [Role.ADMIN] },
      { id: 'laboran-management', label: 'Manajemen Laboran', icon: Wrench, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
      { id: 'pkl-management', label: 'Manajemen PKL', icon: GraduationCap, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
      { id: 'specs-management', label: 'Spesifikasi & Software', icon: Cpu, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
      ]
    },
    {
      id: 'transaksi',
      title: 'Transaksi',
      items: [
      { id: 'loans', label: 'Peminjaman Barang', icon: Box, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
      { id: 'item-movements', label: 'Perpindahan Barang', icon: ArrowRightLeft, roles: [Role.ADMIN, Role.LABORAN, 'Supervisor' as Role] },
      ]
    },
    {
      id: 'pengaturan',
      title: 'Pengaturan',
      items: [
        { id: 'settings', label: 'Pengaturan', icon: Settings, roles: [Role.ADMIN] },
      { id: 'profile', label: 'Profile', icon: Users, roles: [Role.ADMIN, Role.LABORAN, Role.USER, 'Supervisor' as Role] },
      { id: 'tentang', label: 'Tentang', icon: Info, roles: [Role.ADMIN, Role.LABORAN, Role.USER, 'Supervisor' as Role] },
      ]
    }
  ];

  // Add icons to groups
  const jadwalIcon = CalendarRange;
  const manajemenIcon = Users;
  const transaksiIcon = Box;
  const pengaturanIcon = Settings;

  return (
    <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 z-40 ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64 h-screen transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 print:hidden flex flex-col`}>
      <div className={`p-6 border-b border-gray-200 dark:border-gray-700 flex items-center ${isCollapsed ? 'justify-center p-4' : 'space-x-3'} flex-shrink-0 min-h-[5rem] transition-all duration-300`}>
        <img
          src={nocLogo}
          alt="NOC Logo"
          className={`${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} object-contain transition-all duration-300`}
        />
        <div className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 flex-1'}`}>
          <span className="text-xl font-bold text-gray-800 dark:text-white block leading-none whitespace-nowrap">CORE.FTI</span>
          <span className="text-[0.65rem] text-gray-500 dark:text-gray-400 font-medium leading-tight block mt-1">Campus Operational Resource Environment</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Main Items */}
        <div className="mb-8">
          <div className={!isCollapsed ? "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2" : ''}>
            Utama
          </div>
          <nav className="space-y-1">
            {mainItems.filter(item => 
              item.roles.some(r => r.toString().toUpperCase() === currentRole.toString().toUpperCase())
            ).map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  onMouseEnter={(e) => {
                    if (isCollapsed) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredItem({ label: item.label, top: rect.top + rect.height / 2 });
                    }
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-all duration-300 group ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50/50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'} transition-all duration-300`} />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden transition-all duration-300">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dropdown Groups */}
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(item => 
            item.roles.some(r => r.toString().toUpperCase() === currentRole.toString().toUpperCase())
          );

          if (visibleItems.length === 0) return null;

          const isExpanded = expandedGroups.has(group.id);
          const isActiveGroup = visibleItems.some(item => currentPage === item.id);
          const GroupIcon = group.id === 'jadwal' ? jadwalIcon : group.id === 'manajemen' ? manajemenIcon : group.id === 'transaksi' ? transaksiIcon : pengaturanIcon;

          return (
            <div key={group.id} className="mb-4">
              <button
                onClick={() => {
                  if (isCollapsed && onToggleCollapse) {
                    onToggleCollapse(); // Otomatis lebarkan sidebar
                    // Buka dropdown untuk kategori yang diklik
                    const newExpanded = new Set(expandedGroups);
                    newExpanded.add(group.id);
                    setExpandedGroups(newExpanded);
                    return;
                  }
                  const newExpanded = new Set(expandedGroups);
                  if (isExpanded) {
                    newExpanded.delete(group.id);
                  } else {
                    newExpanded.add(group.id);
                  }
                  setExpandedGroups(newExpanded);
                }}
                onMouseEnter={(e) => {
                  if (isCollapsed) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredItem({ label: group.title, top: rect.top + rect.height / 2 });
                  }
                }}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-all duration-300 group ${
                  isActiveGroup
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : isExpanded
                      ? 'bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50/50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <GroupIcon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActiveGroup || isExpanded ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'} transition-all duration-300`} />
                {!isCollapsed && <span className="flex-1 text-left">{group.title}</span>}
                {!isCollapsed && <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />}
              </button>
              {isExpanded && !isCollapsed && (
                <nav className="ml-8 space-y-1 mt-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 group ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50/50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'} mr-3 flex-shrink-0 transition-colors`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          );
        })}

      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-2'} py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-all duration-300`}>
          <Shield className={`w-8 h-8 text-blue-600 p-1.5 bg-blue-100 rounded-full ${isCollapsed ? '' : 'mr-3'} transition-all duration-300`} />
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap transition-all duration-300">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Role Saat Ini</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentRole}</p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button (Desktop Only) */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md hidden md:flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Custom Tooltip for Collapsed Mode */}
      {isCollapsed && hoveredItem && (
        <div 
          className="fixed left-20 z-50 px-3 py-2 ml-2 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg dark:bg-gray-700 whitespace-nowrap pointer-events-none animate-fade-in-up"
          style={{ top: hoveredItem.top, transform: 'translateY(-50%)' }}
        >
          {hoveredItem.label}
          <div className="absolute top-1/2 -left-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform -translate-y-1/2 rotate-45"></div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;