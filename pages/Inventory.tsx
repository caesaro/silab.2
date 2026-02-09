import React, { useState, useEffect } from 'react';
import { MOCK_EQUIPMENT } from '../services/mockData';
import { Equipment } from '../types';
import { Search, Plus, Filter, Edit, Trash2, X, Check, AlertCircle, Box, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, Download } from 'lucide-react';
import ExcelJS from 'exceljs';

const Inventory: React.FC = () => {
  const [items, setItems] = useState<Equipment[]>(MOCK_EQUIPMENT);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState<'All' | 'Baik' | 'Rusak Ringan' | 'Rusak Berat'>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal State for Form
  const [addMode, setAddMode] = useState<'manual' | 'excel'>('manual');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<Partial<Equipment>>({
    id: '', ukswCode: '', name: '', category: '', condition: 'Baik', isAvailable: true
  });

  // Modal State for Delete Confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCondition, filterCategory, itemsPerPage]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.ukswCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = filterCondition === 'All' || item.condition === filterCondition;
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCondition && matchesCategory;
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleOpenModal = (item?: Equipment) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setAddMode('manual');
    } else {
      setEditingItem(null);
      setFormData({ id: '', ukswCode: '', name: '', category: '', condition: 'Baik', isAvailable: true });
      setAddMode('manual');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } as Equipment : i));
    } else {
      if (!formData.id) {
          alert("Kode FTI (ID) wajib diisi!");
          return;
      }
      const newItem: Equipment = {
        ...formData,
      } as Equipment;
      setItems(prev => [...prev, newItem]);
    }
    setIsModalOpen(false);
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Define columns
    worksheet.columns = [
      { header: 'id', key: 'id', width: 20 },
      { header: 'ukswCode', key: 'ukswCode', width: 20 },
      { header: 'name', key: 'name', width: 30 },
      { header: 'category', key: 'category', width: 15 },
      { header: 'condition', key: 'condition', width: 15 }
    ];

    // Add sample row
    worksheet.addRow({
      id: "FTI-NEW-001",
      ukswCode: "UKSW-NEW-001",
      name: "Barang Baru",
      category: "Elektronik",
      condition: "Baik"
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    // Trigger download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'template_inventaris.xlsx';
    anchor.click();
    window.URL.revokeObjectURL(url);
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
          const worksheet = workbook.getWorksheet(1); // Get first sheet

          if (!worksheet) {
             alert("File Excel kosong atau format salah.");
             return;
          }

          const newItems: Equipment[] = [];
          
          // Map headers from first row (1-based index)
          const headers: {[key: number]: string} = {};
          worksheet.getRow(1).eachCell((cell, colNumber) => {
              headers[colNumber] = cell.value ? cell.value.toString() : '';
          });
          
          // Iterate rows starting from 2
          worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return; // Skip header row

              const rowData: any = {};
              row.eachCell((cell, colNumber) => {
                  const header = headers[colNumber];
                  if (header) {
                      // Handle cell values safely
                      rowData[header] = cell.value ? cell.value.toString() : '';
                  }
              });

              if (rowData.id && rowData.name) {
                  // Check for duplicate ID
                  const id = String(rowData.id);
                  if (!items.some(existing => existing.id === id) && !newItems.some(n => n.id === id)) {
                      newItems.push({
                          id: id,
                          ukswCode: rowData.ukswCode ? String(rowData.ukswCode) : '',
                          name: String(rowData.name),
                          category: rowData.category ? String(rowData.category) : 'Umum',
                          condition: rowData.condition ? String(rowData.condition) as any : 'Baik',
                          isAvailable: true
                      });
                  }
              }
          });

          if (newItems.length > 0) {
              setItems(prev => [...prev, ...newItems]);
              alert(`Berhasil mengimport ${newItems.length} barang.`);
              setIsModalOpen(false);
          } else {
              alert("Tidak ada data valid yang diimport. Pastikan ID unik dan format benar.");
          }

      } catch (error) {
          console.error(error);
          alert("Gagal memproses file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      setItems(prev => prev.filter(i => i.id !== deleteTargetId));
      setShowDeleteModal(false);
      setDeleteTargetId(null);
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

  // Get Unique Categories
  const categories = Array.from(new Set(items.map(i => i.category)));

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventaris Laboratorium</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola daftar aset dan barang lab</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
            <Plus className="w-4 h-4 mr-2" /> Tambah Barang
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col lg:flex-row gap-4 justify-between items-center">
         <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nama, Kode FTI, atau Kode UKSW..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
            />
         </div>
         
         <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center justify-end">
             <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Show</span>
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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-4">Kode FTI</th>
                            <th className="px-6 py-4">Kode UKSW</th>
                            <th className="px-6 py-4">Nama Barang</th>
                            <th className="px-6 py-4">Kategori</th>
                            <th className="px-6 py-4">Kondisi</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {currentItems.length > 0 ? currentItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{item.id}</td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.ukswCode}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                                <td className="px-6 py-4 text-gray-500">{item.category}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getConditionColor(item.condition)}`}>
                                        {item.condition}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.isAvailable ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {item.isAvailable ? 'Tersedia' : 'Dipinjam'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => handleOpenModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/30"><Edit className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteClick(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                           <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                 Tidak ada barang yang ditemukan.
                              </td>
                           </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="text-sm text-gray-500 dark:text-gray-400">
                  Menampilkan <span className="font-medium text-gray-900 dark:text-white">{filteredItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> sampai <span className="font-medium text-gray-900 dark:text-white">{Math.min(indexOfLastItem, filteredItems.length)}</span> dari <span className="font-medium text-gray-900 dark:text-white">{filteredItems.length}</span> data
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

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
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
                            disabled={!!editingItem} // ID tidak bisa diedit setelah dibuat
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


                 <div className="flex items-center space-x-2 pt-2">
                    <input 
                        type="checkbox" 
                        id="isAvailable"
                        checked={formData.isAvailable}
                        onChange={e => setFormData({...formData, isAvailable: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isAvailable" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        Barang tersedia untuk dipinjam?
                    </label>
                 </div>

                 <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                       Batal
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all">
                       <Check className="w-4 h-4 mr-2" /> Simpan
                    </button>
                 </div>
              </form>
              ) : ( // Excel Import Mode
                <div className="p-6 space-y-6 animate-fade-in-up">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" /> Petunjuk Import
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                            Gunakan file Excel (.xlsx) dengan header: <code>id, ukswCode, name, category, condition</code>.
                            Pastikan <strong>id</strong> (Kode FTI) unik dan belum ada di database.
                        </p>
                        <button 
                            onClick={downloadTemplate}
                            className="text-xs bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center w-fit"
                        >
                            <Download className="w-3 h-3 mr-1.5" /> Download Template Excel
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-6 text-center">
                 <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hapus Barang?</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Apakah Anda yakin ingin menghapus barang ini dari inventaris? Tindakan ini tidak dapat dibatalkan.
                 </p>
                 <div className="flex justify-center space-x-3">
                    <button 
                       onClick={() => setShowDeleteModal(false)} 
                       className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                       Batal
                    </button>
                    <button 
                       onClick={confirmDelete} 
                       className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                       Ya, Hapus
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