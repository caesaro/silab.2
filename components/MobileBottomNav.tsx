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

const getMobileNavLabel = (id: string, label: string) => {
  if (id === "ruangan") return "Daftar Ruang";
  if (id === "pesanan-ruang") return "Pesanan Ruang";
  if (id === "inventaris") return "Inventaris";
  return label;
};

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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.1)] backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95 md:hidden print:hidden">
      <div className="mx-auto flex max-w-xl items-stretch gap-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const mobileLabel = getMobileNavLabel(item.id, item.label);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[9px] font-normal tracking-[0.01em] transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              }`}
            >
              <Icon className="mb-1 h-4 w-4" />
              <span className="truncate leading-none">{mobileLabel}</span>
            </button>
          );
        })}

        {showMenuButton && (
          <button
            type="button"
            onClick={onOpenMenu}
            className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[9px] font-normal tracking-[0.01em] transition-colors ${
              moreIsActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            }`}
          >
            <Menu className="mb-1 h-4 w-4" />
            <span className="leading-none">Lainnya</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
