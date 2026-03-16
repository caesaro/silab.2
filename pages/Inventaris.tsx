import React, { useState, useEffect } from 'react';
import { Equipment } from '../types';
import { Search, Plus, Filter, Edit, Trash2, X, Check, AlertCircle, Box, ChevronLeft, ChevronRight, FileSpreadsheet, Download, QrCode, Printer, FileText, ChevronDown, Camera, Settings, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import QRCode from "react-qr-code";
import { api } from '../services/api';
import QRScannerModal from '../components/QRScannerModal'; // Assuming this is a reusable component
import ConfirmModal from '../components/ConfirmModal'; // Assuming this is a reusable component
import { TableSkeleton } from '../components/Skeleton';

const LabelComponent = ({ item }: { item: Equipment }) => (
    <div className="p-1 flex flex-col items-center justify-center text-center break-words w-full h-full font-sans">
        <QRCode value={item.id} size={40} level="M" style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
        <p className="mt-1 font-bold text-[7pt] tracking-tighter font-mono break-all leading-none">{item.id}</p>
        <p className="text-[6pt] leading-tight line-clamp-2 mt-0.5">{item.name}</p>
        <p className="text-[5pt] mt-auto pt-0.5 text-gray-600 font-semibold">CORE.FTI</p>
    </div>
);

interface InventoryProps {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const Inventory: React.FC<InventoryProps> = ({ showToast }) => {
  const [items, setItems] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState<'All' | 'Baik' | 'Rusak Ringan' | 'Rusak Berat'>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [singleLabelPaperSize, setSingleLabelPaperSize] = useState<'A4' | 'F4'>('A4');
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Modal State for Form
  const [addMode, setAddMode] = useState<'manual' | 'excel'>('manual');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<Partial<Equipment>>({
    id: '', ukswCode: '', name: '', category: '', condition: 'Baik', isAvailable: true, serialNumber: '', location: '', vendor: ''
  });

  // Modal State for Delete Confirmation (using reusable ConfirmModal)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for QR Code
  const [qrItem, setQrItem] = useState<Equipment | null>(null);

  // Modal State for Detail View
  const [viewDetailItem, setViewDetailItem] = useState<Equipment | null>(null);

  // Scanner State (using reusable QRScannerModal)
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Equipment; direction: 'asc' | 'desc' } | null>(null);

  // Reset page when filters change
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await api('/api/inventory');
      if (res.ok) setItems(await res.json());
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCondition, filterCategory, itemsPerPage]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.ukswCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCondition = filterCondition === 'All' || item.condition === filterCondition;
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCondition && matchesCategory;
  });

  // Sorting Logic
  const sortedItems = React.useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredItems, sortConfig]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  const handleSort = (key: keyof Equipment) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedItems(currentItems.map(i => i.id));
    } else {
        setSelectedItems(prev => prev.filter(id => !currentItems.some(item => item.id === id)));
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
      setSelectedItems(prev => 
          checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
      );
  };

  const handleOpenModal = (item?: Equipment) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setAddMode('manual');
    } else {
      setEditingItem(null);
      setFormData({ id: '', ukswCode: '', name: '', category: '', condition: 'Baik', isAvailable: true, serialNumber: '', location: '', vendor: '' });
      setAddMode('manual');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        const res = await api(`/api/inventory/${editingItem.id}`, {
          method: 'PUT',
          data: formData
        });
        if (res.ok) {
          await fetchItems();
          setIsModalOpen(false);
          showToast("Data barang berhasil diperbarui.", "success");
        } else {
          showToast("Gagal memperbarui data.", "error");
        }
      } else {
        if (!formData.id) {
            showToast("Kode FTI (ID) wajib diisi!", "warning");
            setIsSaving(false);
            return;
        }
        const res = await api('/api/inventory', {
          method: 'POST',
          data: formData
        });
        if (res.ok) {
          await fetchItems();
          setIsModalOpen(false);
          showToast("Data barang berhasil disimpan.", "success");
        } else {
          showToast("Gagal menyimpan data baru.", "error");
        }
      }
    } catch (error) {
      showToast("Gagal menyimpan data.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    worksheet.columns = [
      { header: 'id', key: 'id', width: 20 },
      { header: 'ukswCode', key: 'ukswCode', width: 20 },
      { header: 'name', key: 'name', width: 30 },
      { header: 'category', key: 'category', width: 15 },
      { header: 'condition', key: 'condition', width: 15 },
      { header: 'serialNumber', key: 'serialNumber', width: 20 },
      { header: 'location', key: 'location', width: 25 },
      { header: 'vendor', key: 'vendor', width: 25 }
    ];

    worksheet.addRow({
      id: "FTI-NEW-001",
      ukswCode: "UKSW-NEW-001",
      name: "Barang Baru",
      category: "Elektronik",
      condition: "Baik",
      serialNumber: "SN12345678",
      location: "Rak 1",
      vendor: "PT. Teknologi Maju"
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

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Inventaris');

    worksheet.columns = [
      { header: 'Kode FTI', key: 'id', width: 15 },
      { header: 'Kode UKSW', key: 'ukswCode', width: 20 },
      { header: 'Nama Barang', key: 'name', width: 30 },
      { header: 'Kategori', key: 'category', width: 15 },
      { header: 'Kondisi', key: 'condition', width: 15 },
      { header: 'Serial Number', key: 'serialNumber', width: 20 },
      { header: 'Lokasi', key: 'location', width: 25 },
      { header: 'Vendor', key: 'vendor', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    sortedItems.forEach(item => {
      worksheet.addRow({
        id: item.id,
        ukswCode: item.ukswCode,
        name: item.name,
        category: item.category,
        condition: item.condition,
        serialNumber: item.serialNumber,
        location: item.location || '',
        vendor: item.vendor || '',
        status: item.isAvailable ? 'Tersedia' : 'Dipinjam'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `inventaris_fti_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ["Kode FTI", "Kode UKSW", "Nama Barang", "Kategori", "Kondisi", "Serial Number", "Lokasi", "Vendor", "Status"];
    const rows = sortedItems.map(item => [
      item.id, item.ukswCode, item.name, item.category, item.condition, item.serialNumber || '-', item.location || '-', item.vendor || '-', item.isAvailable ? 'Tersedia' : 'Dipinjam'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventaris_fti_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.getWorksheet(1);

          if (!worksheet) {
             showToast("File Excel kosong atau format salah.", "error");
             return;
          }

          const newItems: Equipment[] = [];
          
          const headers: {[key: number]: string} = {};
          worksheet.getRow(1).eachCell((cell, colNumber) => {
              headers[colNumber] = cell.value ? cell.value.toString() : '';
          });
          
          worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return;

              const rowData: any = {};
              row.eachCell((cell, colNumber) => {
                  const header = headers[colNumber];
                  if (header) {
                      rowData[header] = cell.value ? cell.value.toString() : '';
                  }
              });

              if (rowData.id && rowData.name) {
                  const id = String(rowData.id).trim();
                  if (!items.some(existing => existing.id === id) && !newItems.some(n => n.id === id)) {
                      newItems.push({
                          id: id,
                          ukswCode: rowData.ukswCode ? String(rowData.ukswCode).trim() : '',
                          name: String(rowData.name).trim(),
                          category: rowData.category ? String(rowData.category).trim() : 'Umum',
                          condition: rowData.condition ? String(rowData.condition).trim() as any : 'Baik',
                          isAvailable: true,
                          serialNumber: rowData.serialNumber ? String(rowData.serialNumber).trim() : '',
                          location: rowData.location ? String(rowData.location).trim() : '',
                          vendor: rowData.vendor ? String(rowData.vendor).trim() : ''
                      } as Equipment);
                  }
              }
          });

          if (newItems.length > 0) {
              let successCount = 0;
              let errorCount = 0;
              const errorIds: string[] = [];

              for (const item of newItems) {
                  try {
                      const res = await api('/api/inventory', {
                          method: 'POST',
                          data: item
                      });
                      if (res.ok) {
                          successCount++;
                      } else {
                          errorCount++;
                          errorIds.push(item.id);
                      }
                  } catch (err) {
                      console.error(`Gagal menyimpan item ${item.id}:`, err);
                      errorCount++;
                      errorIds.push(item.id);
                  }
              }

              await fetchItems();

              if (successCount > 0 && errorCount === 0) {
                  showToast(`Berhasil mengimport ${successCount} barang ke database.`, "success");
              } else if (successCount > 0 && errorCount > 0) {
                  showToast(`Berhasil mengimport ${successCount} barang. ${errorCount} barang gagal (ID: ${errorIds.join(', ')}).`, "warning");
              } else {
                  showToast("Gagal mengimport data. Pastikan ID belum ada di database.", "error");
              }
              
              setIsModalOpen(false);
          } else {
              showToast("Tidak ada data valid yang diimport. Pastikan ID unik dan format benar.", "warning");
          }

      } catch (error) {
          console.error(error);
          showToast("Gagal memproses file Excel.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Delete handlers using ConfirmModal
  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      setIsDeleting(true);
      try {
        await api(`/api/inventory/${deleteTargetId}`, { method: 'DELETE' });
        await fetchItems();
        setShowDeleteModal(false);
        setDeleteTargetId(null);
        showToast("Barang berhasil dihapus.", "success");
      } catch (e) { showToast("Gagal menghapus data.", "error"); }
      finally { setIsDeleting(false); }
    }
  };

  const handlePrintMulti = () => {
    const selectedItemsData = items.filter(i => selectedItems.includes(i.id));
    
    // Generate QR code using qrserver.com API with 45px size to match 40mm label
    const getQRCodeURL = (value: string) => {
      return `https://api.qrserver.com/v1/create-qr-code/?size=45x45&data=${encodeURIComponent(value)}`;
    };

    const labelsHTML = selectedItemsData.map(item => `
      <div style="width: 40mm; height: 25mm; padding: 2mm; box-sizing: border-box; border: 1px dashed #ccc; display: flex; flex-direction: column; overflow: hidden; page-break-inside: avoid; float: left; margin: 1mm;">
        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start;">
          <span style="font-size: 5pt; color: #666; font-weight: 600;">CORE.FTI</span>
        </div>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; margin: 1mm 0;">
          <img src="${getQRCodeURL(item.id)}" alt="QR Code" style="width: 45px; height: 45px;" />
        </div>
        <p style="margin: 0; font-weight: bold; font-size: 7pt; font-family: monospace; text-align: center; word-break: break-all;">${item.id}</p>
        <p style="margin: 1px 0 0 0; font-size: 5pt; text-align: center; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; max-height: 2.2em;">${item.name}</p>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak Label Inventaris - CORE.FTI</title>
          <style>
            @page {
              size: ${paperSize};
              margin: 0.5cm;
            }
            body {
              margin: 0;
              padding: 5mm;
              font-family: Arial, sans-serif;
            }
            .label-container {
              width: ${paperSize === 'A4' ? '210mm' : '215mm'};
              min-height: ${paperSize === 'A4' ? '297mm' : '330mm'};
            }
            .clearfix::after {
              content: "";
              clear: both;
              display: table;
            }
          </style>
        </head>
        <body>
          <div class="label-container clearfix">
            ${labelsHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 1000);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintSingle = () => {
    if (!qrItem) return;
    
    // Generate QR code as PNG using qrserver.com API
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrItem.id)}`;
    
    // Create a canvas to compose the label image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw CORE.FTI at top-left
      ctx.fillStyle = '#666666';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('CORE.FTI', 10, 25);
      
      // Load and draw QR code image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Center QR code
        const qrSize = 120;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 35;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        
        // Draw FTI Code below QR
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(qrItem.id, canvas.width / 2, qrY + qrSize + 20);
        
        // Draw Item Name at bottom
        ctx.fillStyle = '#333333';
        ctx.font = '12px Arial';
        ctx.fillText(qrItem.name, canvas.width / 2, qrY + qrSize + 45);
        
        // Convert to PNG and download
        const link = document.createElement('a');
        link.download = `label-${qrItem.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      img.onerror = () => {
        showToast('Gagal menghasilkan gambar QR. Silakan coba lagi.', "error");
      };
      img.src = qrImageUrl;
    }
  };

  const handlePrintSingleDirect = () => {
    if (!qrItem) return;
    
    // Generate QR code using qrserver.com API
    const getQRCodeURL = (value: string) => {
      return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(value)}`;
    };

    const singleLabelHTML = `
      <div style="width: 40mm; height: 25mm; padding: 2mm; box-sizing: border-box; border: 1px dashed #ccc; display: flex; flex-direction: column; overflow: hidden; margin: 5mm auto;">
        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start;">
          <span style="font-size: 5pt; color: #666; font-weight: 600;">CORE.FTI</span>
        </div>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; margin: 1mm 0;">
          <img src="${getQRCodeURL(qrItem.id)}" alt="QR Code" style="width: 45px; height: 45px;" />
        </div>
        <p style="margin: 0; font-weight: bold; font-size: 7pt; font-family: monospace; text-align: center; word-break: break-all;">${qrItem.id}</p>
        <p style="margin: 1px 0 0 0; font-size: 5pt; text-align: center; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; max-height: 2.2em;">${qrItem.name}</p>
      </div>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak Label - CORE.FTI</title>
          <style>
            @page {
              size: 40mm 25mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
          </style>
        </head>
        <body>
          ${singleLabelHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Print single label to A4/F4 sheet (similar to multiple print)
  const handlePrintSingleToSheet = () => {
    if (!qrItem) return;
    
    // Generate QR code using qrserver.com API
    const getQRCodeURL = (value: string) => {
      return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(value)}`;
    };

    // Single label in the same format as multiple print
    const singleLabelHTML = `
      <div style="width: 40mm; height: 25mm; padding: 2mm; box-sizing: border-box; border: 1px dashed #ccc; display: flex; flex-direction: column; overflow: hidden; page-break-inside: avoid; float: left; margin: 1mm;">
        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start;">
          <span style="font-size: 5pt; color: #666; font-weight: 600;">CORE.FTI</span>
        </div>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; margin: 1mm 0;">
          <img src="${getQRCodeURL(qrItem.id)}" alt="QR Code" style="width: 45px; height: 45px;" />
        </div>
        <p style="margin: 0; font-weight: bold; font-size: 7pt; font-family: monospace; text-align: center; word-break: break-all;">${qrItem.id}</p>
        <p style="margin: 1px 0 0 0; font-size: 5pt; text-align: center; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; max-height: 2.2em;">${qrItem.name}</p>
      </div>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak Label - CORE.FTI</title>
          <style>
            @page {
              size: ${singleLabelPaperSize};
              margin: 0.5cm;
            }
            body {
              margin: 0;
              padding: 5mm;
              font-family: Arial, sans-serif;
            }
            .label-container {
              width: ${singleLabelPaperSize === 'A4' ? '210mm' : '215mm'};
              min-height: ${singleLabelPaperSize === 'A4' ? '297mm' : '330mm'};
            }
            .clearfix::after {
              content: "";
              clear: both;
              display: table;
            }
          </style>
        </head>
        <body>
          <div class="label-container clearfix">
            ${singleLabelHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 1000);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleShowQR = (item: Equipment) => {
    setQrItem(item);
  };

  // Scanner handler using QRScannerModal
  const handleScannerScan = (decodedText: string) => {
    const foundItem = items.find(i => i.id === decodedText);
    if (foundItem) {
      setIsScannerOpen(false);
      setViewDetailItem(foundItem);
      showToast("Barang ditemukan.", "success");
    } else {
      showToast(`Barang dengan ID ${decodedText} tidak ditemukan.`, "error");
    }
  };

  // Handle URL scan parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanId = params.get('scan');

    if (scanId && items.length > 0) {
      const foundItem = items.find(i => i.id === scanId);
      if (foundItem) {
        setViewDetailItem(foundItem);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [items]);

  const handleEditFromDetail = () => {
      if (viewDetailItem) {
          const itemToEdit = viewDetailItem;
          setViewDetailItem(null);
          handleOpenModal(itemToEdit);
      }
  };

  const getConditionColor = (condition: string) => {
    switch(condition) {
        case 'Baik': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900';
        case 'Rusak Ringan': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900';
        case 'Rusak Berat': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900';
        default: return 'bg-gray-100';
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category)));

  const SortIcon = ({ columnKey }: { columnKey: keyof Equipment }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc' 
        ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" /> 
        : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Print Report Header */}

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventaris Barang</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola daftar aset dan barang FTI</p>
        </div>
        <div className="flex gap-2">
            <div className="relative">
                <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
                    <Download className="w-4 h-4 mr-2" /> Export <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {isExportOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in-up">
                        <button onClick={handleExportExcel} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel (.xlsx)
                        </button>
                        <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-blue-600" /> CSV
                        </button>
                        <button onClick={() => { window.print(); setIsExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <Printer className="w-4 h-4 mr-2 text-gray-600" /> PDF (Print)
                        </button>
                    </div>
                )}
            </div>
            <button 
                onClick={() => setIsPrintModalOpen(true)} 
                disabled={selectedItems.length === 0}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pilih barang untuk mencetak label"
            >
                <Printer className="w-4 h-4 mr-2" /> Cetak Label ({selectedItems.length})
            </button>
            <button onClick={() => setIsScannerOpen(true)} className="px-3 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
                <Camera className="w-4 h-4 mr-2" /> Scan QR
            </button>
            <button onClick={() => handleOpenModal()} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
                <Plus className="w-4 h-4 mr-2" /> Tambah Barang
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col lg:flex-row gap-4 justify-between items-center print:hidden">
         <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nama, Kode FTI, UKSW, atau SN..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
            />
         </div>
         
         <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center justify-end">
             <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tampilkan</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
             </div>

             <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>

             <div className="flex items-center gap-2">
                 <Filter className="w-4 h-4 text-gray-400" />
                 <select 
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none max-w-[150px]"
                 >
                     <option value="All">Semua Kategori</option>
                     {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                     ))}
                 </select>
             </div>

             <div className="flex items-center gap-2">
             <Filter className="w-4 h-4 text-gray-400" />
             <select 
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
             >
                 <option value="All">Semua Kondisi</option>
                 <option value="Baik">Baik</option>
                 <option value="Rusak Ringan">Rusak Ringan</option>
                 <option value="Rusak Berat">Rusak Berat</option>
             </select>
         </div>
         </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col print:shadow-none print:border-black print:border-2">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 print:bg-gray-200 print:text-black">
                        <tr>
                            <th className="px-2 py-4 print:hidden">
                                <input 
                                    type="checkbox"
                                    className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                                    onChange={handleSelectAll}
                                    checked={currentItems.length > 0 && currentItems.every(i => selectedItems.includes(i.id))}
                                    ref={input => {
                                        if (input) {
                                            const someSelected = currentItems.some(i => selectedItems.includes(i.id));
                                            input.indeterminate = someSelected && !currentItems.every(i => selectedItems.includes(i.id));
                                        }
                                    }}
                                />
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => handleSort('id')}>
                                <div className="flex items-center">Kode FTI <SortIcon columnKey="id" /></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => handleSort('ukswCode')}>
                                <div className="flex items-center">Kode UKSW <SortIcon columnKey="ukswCode" /></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => handleSort('serialNumber')}>
                                <div className="flex items-center">Serial Number <SortIcon columnKey="serialNumber" /></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => handleSort('name')}>
                                <div className="flex items-center">Nama Barang <SortIcon columnKey="name" /></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => handleSort('category')}>
                                <div className="flex items-center">Kategori <SortIcon columnKey="category" /></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => handleSort('condition')}>
                                <div className="flex items-center">Kondisi <SortIcon columnKey="condition" /></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => handleSort('location')}>
                                <div className="flex items-center">Lokasi <SortIcon columnKey="location" /></div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => handleSort('isAvailable')}>
                                <div className="flex items-center">Status <SortIcon columnKey="isAvailable" /></div>
                            </th>
                            <th className="px-6 py-4 text-right print:hidden">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-400">
                        {currentItems.length > 0 ? currentItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setViewDetailItem(item)}>
                                <td className="px-2 py-4 print:hidden" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        type="checkbox"
                                        className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                                        checked={selectedItems.includes(item.id)}
                                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                    />
                                </td>
                                <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{item.id}</td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.ukswCode}</td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.serialNumber || '-'}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                                <td className="px-6 py-4 text-gray-500">{item.category}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium border print:border-gray-400 ${getConditionColor(item.condition)}`}>
                                        {item.condition}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.location || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium print:border print:border-gray-400 ${item.isAvailable ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {item.isAvailable ? 'Tersedia' : 'Dipinjam'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right print:hidden" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => handleShowQR(item)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-400 dark:hover:bg-gray-700" title="Lihat QR Code"><QrCode className="w-4 h-4"/></button>
                                        <button onClick={() => handleOpenModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/30"><Edit className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                           <tr>
                              <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                 <div className="flex flex-col items-center justify-center">
                                    <Box className="w-12 h-12 text-gray-300 mb-3" />
                                    <p>Tidak ada barang yang ditemukan.</p>
                                 </div>
                              </td>
                           </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
               <div className="text-sm text-gray-500 dark:text-gray-400">
                  Menampilkan <span className="font-medium text-gray-900 dark:text-white">{sortedItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> sampai <span className="font-medium text-gray-900 dark:text-white">{Math.min(indexOfLastItem, sortedItems.length)}</span> dari <span className="font-medium text-gray-900 dark:text-white">{sortedItems.length}</span> data
               </div>
               
               <div className="flex items-center space-x-2">
                  <button 
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                     disabled={currentPage === 1}
                     className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                     Halaman {currentPage} dari {totalPages || 1}
                  </span>
                  <button 
                     onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                     disabled={currentPage === totalPages || totalPages === 0}
                     className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-full sm:max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white">
                    {editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              {!editingItem && (
                  <div className="flex border-b border-gray-200 dark:border-gray-700">
                      <button 
                          type="button"
                          className={`flex-1 py-3 text-sm font-medium transition-colors ${addMode === 'manual' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                          onClick={() => setAddMode('manual')}
                      >
                          Input Manual
                      </button>
                      <button 
                          type="button"
                          className={`flex-1 py-3 text-sm font-medium transition-colors ${addMode === 'excel' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                          onClick={() => setAddMode('excel')}
                      >
                          Import Excel
                      </button>
                  </div>
              )}

              {addMode === 'manual' ? (
              <form onSubmit={handleSave} className="p-6 space-y-4 animate-fade-in-up">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Barang</label>
                    <input 
                        type="text" required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Contoh: Projector Epson X1"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode FTI (ID)</label>
                        <input 
                            type="text" required 
                            value={formData.id} 
                            onChange={e => setFormData({...formData, id: e.target.value})}
                            disabled={!!editingItem}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                            placeholder="FTI-XXX-001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode UKSW</label>
                        <input 
                            type="text" required 
                            value={formData.ukswCode} 
                            onChange={e => setFormData({...formData, ukswCode: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                            placeholder="UKSW-INV-..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                        <input 
                            type="text" 
                            value={formData.serialNumber || ''} 
                            onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                            placeholder="SN-XXXXX"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                        <input 
                            type="text" required 
                            value={formData.category} 
                            onChange={e => setFormData({...formData, category: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Elektronik"
                        />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kondisi</label>
                    <select 
                        value={formData.condition}
                        onChange={e => setFormData({...formData, condition: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                    <option value="Baik">Baik</option>
                        <option value="Rusak Ringan">Rusak Ringan</option>
                        <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasi / Rak</label>
                        <input 
                            type="text" 
                            value={formData.location || ''} 
                            onChange={e => setFormData({...formData, location: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Contoh: Rak 1, Ruang 301"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor / Toko</label>
                        <input 
                            type="text" 
                            value={formData.vendor || ''} 
                            onChange={e => setFormData({...formData, vendor: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Contoh: CV. Komputer Maju"
                        />
                     </div>
                 </div>

                 <div className="flex items-center space-x-2 pt-2">
                    <input 
                        type="checkbox" 
                        id="isAvailable"
                        checked={formData.isAvailable}
                        onChange={e => setFormData({...formData, isAvailable: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                    />
                    <label htmlFor="isAvailable" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        Status Tersedia (Dapat Dipinjam)
                    </label>
                 </div>

                 <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                       Batal
                    </button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                       {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                       {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                 </div>
              </form>
              ) : (
                <div className="p-6 space-y-6 animate-fade-in-up">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" /> Petunjuk Import
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                            Gunakan file Excel (.xlsx) dengan header: <code>id, ukswCode, name, category, condition, serialNumber, location, vendor</code>.
                            Pastikan <strong>id</strong> (Kode FTI) unik dan belum ada di database.
                        </p>
                        <button 
                            onClick={downloadTemplate}
                            className="text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center w-fit"
                        >
                            <Download className="w-3 h-3 mr-1.5" /> Unduh Template Excel
                        </button>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <input 
                            type="file" 
                            id="csv-upload" 
                            accept=".xlsx, .xls"
                            onChange={handleExcelUpload}
                            className="hidden" 
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mb-3">
                                <FileSpreadsheet className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Klik untuk upload file Excel</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Maksimal 2MB</span>
                        </label>
                    </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Using reusable ConfirmModal component */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTargetId(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Barang"
        message="Apakah Anda yakin ingin menghapus barang ini dari inventaris? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
        isLoading={isDeleting}
      />

      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print-modal-active">
            <style>{`
              @media print {
                body > *:not(.print-modal-active) {
                  display: none;
                }
                .print-modal-active {
                  position: static;
                  background: none;
                  backdrop-filter: none;
                }
                .print-content-wrapper {
                  box-shadow: none;
                  border: none;
                  height: auto;
                  max-height: none;
                }
                .print-controls, .no-print {
                  display: none;
                }
                #print-preview-area {
                  padding: 0;
                  background: none;
                }
                #multi-label-print-area {
                  box-shadow: none;
                  margin: 0;
                  padding: 0;
                }
                .sticker-label {
                  border: none !important; /* Hilangkan border saat print */
                }
                @page { 
                  size: ${paperSize};
                  margin: 0.5cm;
                }
              }
            `}</style>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up print-content-wrapper">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0 print-controls">
                    <h3 className="font-bold text-gray-900 dark:text-white">Cetak Label ({selectedItems.length} Barang)</h3>
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="text-sm font-medium mr-2 dark:text-gray-300">Ukuran Kertas:</label>
                            <select value={paperSize} onChange={e => setPaperSize(e.target.value as any)} className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm">
                                <option value="A4">A4</option>
                                <option value="F4">F4</option>
                            </select>
                        </div>
                        <button onClick={handlePrintMulti} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center">
                            <Printer className="w-4 h-4 mr-2" /> Cetak
                        </button>
                        <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div id="print-preview-area" className="flex-1 overflow-auto p-6 bg-gray-200 dark:bg-gray-900">
                    <div id="multi-label-print-area" className="bg-white shadow-lg mx-auto p-[5mm] box-border flex flex-wrap content-start gap-0" style={paperSize === 'A4' ? { width: '210mm', minHeight: '297mm' } : { width: '215mm', minHeight: '330mm' }}>
                        {items.filter(i => selectedItems.includes(i.id)).map(item => (
                            <div key={item.id} className="sticker-label" style={{ width: '40mm', height: '25mm', padding: '2mm', boxSizing: 'border-box', border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', pageBreakInside: 'avoid' }}>
                                <LabelComponent item={item} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {viewDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center text-base">
                    <Box className="w-5 h-5 mr-2 text-blue-600" />
                    Detail Barang
                 </h3>
                 <button onClick={() => setViewDetailItem(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-6 space-y-4">
                  <div className="text-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{viewDetailItem.name}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{viewDetailItem.category}</p>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                          <span className="text-gray-500 dark:text-gray-400">Kode FTI (ID)</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">{viewDetailItem.id}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                          <span className="text-gray-500 dark:text-gray-400">Kode UKSW</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">{viewDetailItem.ukswCode}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                          <span className="text-gray-500 dark:text-gray-400">Serial Number</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">{viewDetailItem.serialNumber || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                          <span className="text-gray-500 dark:text-gray-400">Lokasi</span>
                          <span className="font-medium text-gray-900 dark:text-white">{viewDetailItem.location || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                          <span className="text-gray-500 dark:text-gray-400">Vendor</span>
                          <span className="font-medium text-gray-900 dark:text-white">{viewDetailItem.vendor || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                          <span className="text-gray-500 dark:text-gray-400">Kondisi</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getConditionColor(viewDetailItem.condition)}`}>
                              {viewDetailItem.condition}
                          </span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400">Status</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${viewDetailItem.isAvailable ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {viewDetailItem.isAvailable ? 'Tersedia' : 'Dipinjam'}
                          </span>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => setViewDetailItem(null)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm">
                          Tutup
                      </button>
                      <button onClick={handleEditFromDetail} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center">
                          <Edit className="w-4 h-4 mr-2" /> Edit Barang
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* Using reusable QRScannerModal component */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScannerScan}
        title="Scan QR Code Barang"
      />

      {qrItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                    <QrCode className="w-5 h-5 mr-2 text-blue-600" />
                    Label Barang
                 </h3>
                 <button onClick={() => setQrItem(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div id="single-label-print-area" className="bg-white">
                  <div className="p-6 flex flex-col items-center justify-center">
                      <QRCode value={qrItem.id} size={150} level="M" />
                      <p className="mt-4 font-bold text-lg text-gray-900 font-mono tracking-wide">{qrItem.id}</p>
                      <p className="text-sm text-gray-600 text-center">{qrItem.name}</p>
                      <p className="text-xs text-gray-500 mt-2 font-semibold">CORE.FTI</p>
                  </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {/* Paper Size Selector for Single Label */}
                  <div className="mb-3 flex items-center justify-center">
                      <label className="text-sm font-medium mr-2 dark:text-gray-300">Ukuran Kertas:</label>
                      <select 
                          value={singleLabelPaperSize} 
                          onChange={(e) => setSingleLabelPaperSize(e.target.value as 'A4' | 'F4')} 
                          className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
                      >
                          <option value="A4">A4</option>
                          <option value="F4">F4</option>
                      </select>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                      <button onClick={handlePrintSingleToSheet} className="px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg flex items-center shadow-md">
                          <Printer className="w-4 h-4 mr-2" /> Cetak ke Kertas ({singleLabelPaperSize})
                      </button>
                      <button onClick={handlePrintSingle} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md">
                          <Download className="w-4 h-4 mr-2" /> Download PNG
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;