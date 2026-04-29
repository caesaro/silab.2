import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Role } from '../types';
import {
  getVisibleMainItems,
  getVisibleNavigationGroups,
} from '../lib/navigation';
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const mainItems = getVisibleMainItems(currentRole);
  const menuGroups = getVisibleNavigationGroups(currentRole);

  useEffect(() => {
    const activeGroup = menuGroups.find((group) =>
      group.items.some((item) => item.id === currentPage)
    );

    if (!activeGroup) {
      return;
    }

    setExpandedGroups((prev) => {
      if (prev.has(activeGroup.id)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(activeGroup.id);
      return next;
    });
  }, [currentPage, menuGroups]);

  return (
    <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 h-screen w-[min(20rem,88vw)] bg-white shadow-xl transition-all duration-300 dark:bg-gray-800 md:relative md:translate-x-0 md:shadow-none ${isCollapsed ? 'md:w-20' : 'md:w-64'} border-r border-gray-200 dark:border-gray-700 print:hidden flex flex-col`}>
      <div className={`border-b border-gray-200 dark:border-gray-700 flex items-center ${isCollapsed ? 'justify-center p-4' : 'space-x-3 p-5 md:p-6'} shrink-0 min-h-20 transition-all duration-300`}>
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

      <div className="flex-1 overflow-y-auto p-4 pb-8">
        {/* Main Items */}
        <div className="mb-8">
          <div className={!isCollapsed ? "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2" : ''}>
            Utama
          </div>
          <nav className="space-y-1">
            {mainItems.map((item) => {
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
                  className={`w-full flex min-h-11 items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all duration-300 group ${
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
          const isExpanded = expandedGroups.has(group.id);
          const isActiveGroup = group.items.some(item => currentPage === item.id);
          const GroupIcon = group.icon;

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
                className={`w-full flex min-h-11 items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-xl transition-all duration-300 group ${
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
                <nav className="ml-6 pl-2 space-y-1 mt-1 border-l-2 border-gray-100 dark:border-gray-700">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex min-h-11 items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 group ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50/50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'} mr-3 shrink-0 transition-colors`} />
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
