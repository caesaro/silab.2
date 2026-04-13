import React from 'react';

interface SkeletonProps {
  className?: string;
}

// Komponen Dasar Skeleton (Kotak Abu-abu berdenyut)
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

// Skeleton Khusus untuk Tabel (User Management, Inventory, dll)
export const TableSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
           <Skeleton className="h-8 w-48" />
           <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Toolbar & Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
           <Skeleton className="h-10 w-full sm:w-64" />
           <div className="flex gap-2 w-full sm:w-auto">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
           </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center space-x-4">
               <Skeleton className="w-10 h-10 rounded-full shrink-0" />
               <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
               </div>
               <div className="hidden sm:block w-1/4 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
               </div>
               <Skeleton className="h-6 w-20 rounded-full" />
               <div className="flex space-x-2">
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="w-8 h-8 rounded" />
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};