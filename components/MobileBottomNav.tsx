import React from "react";
import { Menu } from "lucide-react";

import { Role } from "../types";
import { getMobilePrimaryItems } from "../lib/navigation";

interface MobileBottomNavProps {
  currentRole: Role;
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenMenu: () => void;
  showMenuButton: boolean;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRole,
  currentPage,
  onNavigate,
  onOpenMenu,
  showMenuButton,
}) => {
  const visibleItems = getMobilePrimaryItems(currentRole);
  const primaryItems = showMenuButton
    ? visibleItems.slice(0, 3)
    : visibleItems.slice(0, 4);

  const moreIsActive =
    showMenuButton &&
    currentPage !== "" &&
    !primaryItems.some((item) => item.id === currentPage);

  if (primaryItems.length === 0 && !showMenuButton) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95 md:hidden print:hidden">
      <div className="mx-auto flex max-w-xl items-stretch gap-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              }`}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {showMenuButton && (
          <button
            type="button"
            onClick={onOpenMenu}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
              moreIsActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            }`}
          >
            <Menu className="mb-1 h-5 w-5" />
            <span>Lainnya</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
