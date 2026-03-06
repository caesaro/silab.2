// Shared Utility Functions
// Centralized helper functions to avoid code duplication across pages

import ExcelJS from 'exceljs';

/**
 * Get CSS classes for condition badge color
 */
export const getConditionColor = (condition?: string): string => {
  switch (condition) {
    case 'Baik':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
    case 'Rusak Ringan':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
    case 'Rusak Berat':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  }
};

/**
 * Get CSS classes for room category badge color
 */
export const getCategoryColor = (category?: string): string => {
  switch (category) {
    case 'Laboratorium Komputer':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    case 'Teori':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
    case 'Praktek':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
    case 'Rekreasi':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-200 dark:border-pink-800';
    case 'Meeting':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
    case 'Lounge':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
    case 'Open Space':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800';
    case 'Auditorium/Ruang Kuliah Umum':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  }
};

/**
 * Format Google Calendar event time for display
 */
export const formatEventTime = (dateTime?: string, date?: string): string => {
  if (dateTime) {
    return new Date(dateTime).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (date) {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' (All Day)';
  }
  return '-';
};

/**
 * Extract Calendar ID from Google Calendar Embed URL
 */
export const getCalendarId = (input: string): string | null => {
  if (!input) return null;
  const cleanInput = input.trim();
  // If input is not a URL (no http), assume it's already a Calendar ID
  if (!cleanInput.startsWith('http')) {
    return cleanInput;
  }
  try {
    const urlObj = new URL(input);
    const src = urlObj.searchParams.get('src');
    return src ? decodeURIComponent(src) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Get CSS classes for loan status badge
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Dipinjam':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Dikembalikan':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Terlambat':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Disetujui':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Ditolak':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

/**
 * Download Excel template for inventory
 */
export const downloadInventoryTemplate = async (): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');

  worksheet.columns = [
    { header: 'id', key: 'id', width: 20 },
    { header: 'ukswCode', key: 'ukswCode', width: 20 },
    { header: 'name', key: 'name', width: 30 },
    { header: 'category', key: 'category', width: 15 },
    { header: 'condition', key: 'condition', width: 15 },
    { header: 'serialNumber', key: 'serialNumber', width: 20 },
    { header: 'location', key: 'location', width: 25 }
  ];

  worksheet.addRow({
    id: 'FTI-NEW-001',
    ukswCode: 'UKSW-NEW-001',
    name: 'Barang Baru',
    category: 'Elektronik',
    condition: 'Baik',
    serialNumber: 'SN12345678',
    location: 'Rak 1'
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'template_inventaris.xlsx';
  anchor.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Download Excel template for computer specs
 */
export const downloadComputerTemplate = async (): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template Komputer');

  worksheet.columns = [
    { header: 'No PC', key: 'pcNumber', width: 10 },
    { header: 'OS', key: 'os', width: 15 },
    { header: 'CPU', key: 'cpu', width: 25 },
    { header: 'Tipe GPU (Integrated/Dedicated)', key: 'gpuType', width: 25 },
    { header: 'Model GPU', key: 'gpuModel', width: 20 },
    { header: 'VRAM', key: 'vram', width: 10 },
    { header: 'RAM', key: 'ram', width: 10 },
    { header: 'Storage', key: 'storage', width: 25 },
    { header: 'Monitor', key: 'monitor', width: 20 },
    { header: 'Keyboard', key: 'keyboard', width: 20 },
    { header: 'Mouse', key: 'mouse', width: 20 },
    { header: 'Kondisi', key: 'condition', width: 15 },
  ];

  worksheet.addRow({
    pcNumber: 'PC-01',
    os: 'Windows 11',
    cpu: 'Intel Core i5-12400',
    gpuType: 'Integrated',
    gpuModel: 'Intel UHD 730',
    vram: '-',
    ram: '16GB',
    storage: 'SSD 512GB',
    monitor: 'Dell 24"',
    keyboard: 'Logitech',
    mouse: 'Logitech',
    condition: 'Baik'
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_data_komputer.xlsx';
  a.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export data to Excel file
 */
export const exportToExcel = async <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: { header: string; key: keyof T | string; width: number }[]
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  worksheet.columns = columns as ExcelJS.Column[];

  data.forEach(item => {
    worksheet.addRow(item as unknown as ExcelJS.RowValues);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export data to CSV file
 */
export const exportToCSV = <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers: string[]
): void => {
  const rows = data.map(item => headers.map(h => `"${item[h as keyof T] || '-'}"`).join(','));
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parse Excel file and return rows as array of objects
 */
export const parseExcelFile = async (
  file: ArrayBuffer,
  requiredHeaders: string[]
): Promise<Record<string, string>[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);
  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    throw new Error('File Excel kosong atau format salah.');
  }

  // Map headers from first row
  const headers: Record<number, string> = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value ? cell.value.toString() : '';
  });

  const results: Record<string, string>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const rowData: Record<string, string> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowData[header] = cell.value ? cell.value.toString() : '';
      }
    });

    if (Object.keys(rowData).length > 0) {
      results.push(rowData);
    }
  });

  return results;
};

