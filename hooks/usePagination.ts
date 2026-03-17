import { useState, useMemo } from 'react';

export function usePagination<T>(data: T[], initialItemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const paginatedData = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return data.slice(indexOfFirstItem, indexOfLastItem);
  }, [data, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const resetPage = () => setCurrentPage(1);

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalPages,
    nextPage,
    prevPage,
    resetPage
  };
}