// Page: ItemMovements (Perpindahan Barang)
import React, { useState, useEffect, useRef } from 'react';
import { Role, ItemMovement, Equipment } from '../types';
import { Search, Filter, Plus, X, ArrowRightLeft, Box, Calendar, MapPin, FileText, Eye, Save, RotateCcw, ArrowUpRight, ArrowDownLeft, Hand, ChevronLeft, ChevronRight, QrCode, Loader2, Trash2, Edit } from 'lucide-react';
import { api } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import QRScannerModal from '../components/QRScannerModal';
import { usePagination } from '../hooks/usePagination';
import SearchableSelect, { SelectOption } from '../components/SearchableSelect';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { formatDateID } from '../src/utils/formatters';

interface ItemMovementsProps {
  role: Role;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const ItemMovements: React.FC<ItemMovementsProps> = ({ role, showToast }) => {
  const [movements, setMovements] = useState<ItemMovement[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Peminjaman' | 'Manual' | 'Pengembalian'>('All');
  const [filterInventory, setFilterInventory] = useState<string>('All');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [undoTargetId, setUndoTargetId] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    inventoryIds: [''],
    movementDate: new Date().toISOString().split('T')[0],
    movementType: 'Manual' as 'Manual' | 'Peminjaman',
    fromPerson: '',
    toPerson: '',
    movedBy: '',
    quantity: 1,
    fromLocation: '',
    toLocation: '',
    notes: ''
  });

  const [selectedMovement, setSelectedMovement] = useState<ItemMovement | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanningRowIndex, setScanningRowIndex] = useState<number | null>(null);

  // Menyimpan data scan terakhir untuk mencegah spam
  const lastScannedRef = useRef<{text: string, time: number}>({ text: '', time: 0 });

  useEffect(() => {
    // Initial data fetch
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [movRes, eqRes] = await Promise.all([
        api('/api/item-movements'),
        api('/api/inventory')
      ]);
      if (movRes.ok) setMovements(await movRes.json());
      if (eqRes.ok) setEquipment(await eqRes.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const [viewMode, setViewMode] = useState<'latest' | 'history'>('latest');

  // Group movements by inventory ID and get only the latest movement per item
  const latestMovementsByItem = React.useMemo(() => {
    const grouped = movements.reduce((groups, movement) => {
      const key = movement.inventoryId;
      if (!groups[key]) {
        groups[key] = movement;
      } else {
        // Keep the latest movement (by date, then by createdAt)
        const existing = groups[key];
        const existingDate = new Date(existing.movementDate);
        const newDate = new Date(movement.movementDate);
        if (newDate > existingDate || 
            (newDate.getTime() === existingDate.getTime() && 
             new Date(movement.createdAt || 0) > new Date(existing.createdAt || 0))) {
          groups[key] = movement;
        }
      }
      return groups;
    }, {} as Record<string, ItemMovement>);
    return Object.values(grouped);
  }, [movements]);

  // Filter logic
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterInventory, viewMode]);

  const baseMovements = viewMode === 'latest' ? latestMovementsByItem : movements;
  const filteredMovements = baseMovements.filter(m => {
    const matchesSearch = (m.inventoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.fromPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.toPerson?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'All' || m.movementType === filterType; // Corrected: Use filterType
    const matchesInventory = filterInventory === 'All' || m.inventoryId === filterInventory; // Corrected: Use filterInventory
    return matchesSearch && matchesType && matchesInventory;
  });

  // Pagination hook
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData: currentMovements,
    totalPages,
    prevPage,
    nextPage
  } = usePagination(filteredMovements, 10); // Default itemsPerPage to 10



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedIds = formData.inventoryIds.filter(id => id !== '');

    if (selectedIds.length === 0 || !formData.movementDate || !formData.toPerson || !formData.movedBy) {
      showToast("Mohon lengkapi data perpindahan.", "error");
      return;
    }

    if (editingMovementId) {
      try {
        const res = await api(`/api/item-movements/${editingMovementId}`, {
          method: 'PUT',
          data: {
            movementDate: formData.movementDate,
            fromPerson: formData.fromPerson,
            toPerson: formData.toPerson,
            movedBy: formData.movedBy,
            quantity: formData.quantity,
            fromLocation: formData.fromLocation,
            toLocation: formData.toLocation,
            notes: formData.notes
          }
        });
        
        if (res.ok) {
          fetchData();
          showToast(`Data perpindahan berhasil diperbarui.`, "success");
          setIsModalOpen(false);
          resetForm();
        } else {
          const data = await res.json();
          showToast(data.error || "Gagal memperbarui data", "error");
        }
      } catch (e) { showToast("Gagal menyimpan data", "error"); }
    } else {
      try {
        const promises = selectedIds.map(id => {
          const selectedEquipment = equipment.find(item => item.id === id);
          const currentLocation = selectedEquipment?.location || formData.fromLocation;

          return api('/api/item-movements', {
            method: 'POST',
            data: {
              inventoryId: id,
              movementDate: formData.movementDate,
              movementType: formData.movementType,
              fromPerson: formData.fromPerson,
              toPerson: formData.toPerson,
              movedBy: formData.movedBy,
              quantity: formData.quantity,
              fromLocation: currentLocation,
              toLocation: formData.toLocation,
              notes: formData.notes
            }
          });
        });
        
        const results = await Promise.all(promises);
        if (results.every(res => res.ok)) {
          fetchData();
          showToast(`${selectedIds.length} perpindahan barang berhasil dicatat.`, "success");
          setIsModalOpen(false);
          resetForm();
        } else {
          showToast("Sebagian atau seluruh data gagal disimpan", "warning");
        }
      } catch (e) { showToast("Gagal menyimpan data", "error"); }
    }
  };

  const resetForm = () => {
    setFormData({
      inventoryIds: [''],
      movementDate: new Date().toISOString().split('T')[0],
      movementType: 'Manual',
      fromPerson: '',
      toPerson: '',
      movedBy: '',
      quantity: 1,
      fromLocation: '',
      toLocation: '',
      notes: ''
    });
    setEditingMovementId(null);
  };

  const handleEditClick = (movement: ItemMovement) => {
    setFormData({
      inventoryIds: [movement.inventoryId],
      movementDate: movement.movementDate || new Date().toISOString().split('T')[0],
      movementType: movement.movementType as 'Manual',
      fromPerson: movement.fromPerson || '',
      toPerson: movement.toPerson || '',
      movedBy: movement.movedBy || '',
      quantity: movement.quantity || 1,
      fromLocation: movement.fromLocation || '',
      toLocation: movement.toLocation || '',
      notes: movement.notes || ''
    });
    setEditingMovementId(movement.id);
    setIsModalOpen(true);
  };

  const addEquipmentRow = () => {
    setFormData(prev => ({ ...prev, inventoryIds: [...prev.inventoryIds, ''] }));
  };

  const removeEquipmentRow = (index: number) => {
    if (formData.inventoryIds.length > 1) {
      setFormData(prev => ({
        ...prev,
        inventoryIds: prev.inventoryIds.filter((_, i) => i !== index)
      }));
    }
  };

  const updateEquipmentRow = (index: number, value: string) => {
    const newIds = [...formData.inventoryIds];
    newIds[index] = value;
    setFormData(prev => ({ ...prev, inventoryIds: newIds }));
  };

  const getEquipmentOptions = (currentSelectedId: string): SelectOption[] => {
    return equipment.map(item => ({
      value: item.id,
      label: item.name,
      subLabel: `Kode FTI: ${item.id}`,
      disabled: formData.inventoryIds.includes(item.id) && item.id !== currentSelectedId
    }));
  };

  const renderTypeBadge = (type: string) => {
    let color = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    let Icon = ArrowRightLeft;

    if (type === 'Peminjaman') {
      color = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      Icon = ArrowUpRight;
    } else if (type === 'Pengembalian') {
      color = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      Icon = ArrowDownLeft;
    } else if (type === 'Manual') {
      color = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      Icon = Hand;
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {type}
      </span>
    );
  };

  const handleUndoClick = (id: string) => {
    setUndoTargetId(id);
    setIsUndoModalOpen(true);
  };

  const confirmUndo = async () => {
    if (!undoTargetId) return;
    setIsUndoing(true);
    try {
      const res = await api(`/api/item-movements/${undoTargetId}/undo`, { method: 'POST' });
      if (res.ok) {
        showToast("Perpindahan berhasil dibatalkan.", "success");
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Gagal membatalkan perpindahan", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan server", "error");
    } finally {
      setIsUndoing(false);
      setIsUndoModalOpen(false);
      setUndoTargetId(null);
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    const now = Date.now();
    // Abaikan jika QR yang sama discan dalam waktu kurang dari 3 detik
    if (lastScannedRef.current.text === decodedText && now - lastScannedRef.current.time < 3000) {
      return;
    }
    lastScannedRef.current = { text: decodedText, time: now };

    const item = equipment.find(e => e.id === decodedText);
    if (item) {
      const isDuplicate = formData.inventoryIds.some((id, idx) => 
        id === decodedText && (scanningRowIndex === null || idx !== scanningRowIndex)
      );
      
      if (isDuplicate) {
        showToast("Barang sudah ada di daftar", "warning");
        return;
      }

      setFormData(prev => {
        const newIds = [...prev.inventoryIds];
        if (scanningRowIndex !== null) {
          newIds[scanningRowIndex] = decodedText;
        } else {
          if (newIds.length === 1 && newIds[0] === '') {
            newIds[0] = decodedText;
          } else {
            newIds.push(decodedText);
          }
        }
        
        return { ...prev, inventoryIds: newIds, fromLocation: item.location || prev.fromLocation };
      });
      setScanningRowIndex(null);
      showToast(`Ditambahkan: ${item.name}`, "success");
    } else {
      showToast(`ID ${decodedText} tidak ditemukan`, "error");
    }
  };

  const getEquipmentName = (id: string) => {
    const item = equipment.find(e => e.id === id);
    return item ? item.name : id;
  };

  // Datalist untuk autocomplete input nama
  const uniquePeople = Array.from(new Set(movements.flatMap(m => [m.fromPerson, m.toPerson, m.movedBy]).filter(Boolean)));

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perpindahan Barang</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Tracking perpindahan dan lokasi inventaris</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium shadow-sm transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2" /> Input Manual
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('latest')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'latest'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Posisi Terakhir
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'history'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Riwayat Lengkap
            </button>
          </div>
          <SearchBar 
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Cari barang atau orang..."
          />
        </div>
        
        <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">Semua Jenis</option>
              <option value="Peminjaman">Peminjaman</option>
              <option value="Manual">Manual</option>
              <option value="Pengembalian">Pengembalian</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-gray-400" />
            <select 
              value={filterInventory}
              onChange={(e) => setFilterInventory(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 max-w-50"
            >
              <option value="All">Semua Barang</option>
              {equipment.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Barang</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Lokasi Sebelum</th>
                <th className="px-6 py-4">Lokasi Sekarang</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentMovements.length > 0 ? currentMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{movement.inventoryName || getEquipmentName(movement.inventoryId)}</div>
                    <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">{movement.inventoryId}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDateID(movement.movementDate)}
                      {movement.createdAt && ` • ${new Date(movement.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderTypeBadge(movement.movementType)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <MapPin className="w-3 h-3 mr-1" />
                      {movement.fromLocation || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <MapPin className="w-3 h-3 mr-1" />
                      {movement.toLocation || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {movement.movementType === 'Manual' && viewMode === 'latest' && (
                        <button
                          onClick={() => handleUndoClick(movement.id)}
                          className="text-orange-600 hover:text-orange-800 text-xs font-medium flex items-center"
                          title="Batalkan Perpindahan Terakhir"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" /> Undo
                        </button>
                      )}
                  {movement.movementType === 'Manual' && (
                    <button
                      onClick={() => handleEditClick(movement)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </button>
                  )}
                      <button 
                        onClick={() => setSelectedMovement(movement)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" /> Detail
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <ArrowRightLeft className="w-12 h-12 text-gray-300 mb-3" />
                      <p>Tidak ada data perpindahan.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredMovements.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                {editingMovementId ? <Edit className="w-5 h-5 mr-2 text-blue-600" /> : <ArrowRightLeft className="w-5 h-5 mr-2 text-blue-600" />}
                {editingMovementId ? 'Edit Perpindahan Manual' : 'Input Perpindahan Manual'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <datalist id="people-list">
                {uniquePeople.map(person => (
                  <option key={person} value={person} />
                ))}
              </datalist>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Daftar Barang</label>
                  {!editingMovementId && (
                    <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setScanningRowIndex(null);
                        setIsScannerOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:underline flex items-center font-medium"
                    >
                      <QrCode className="w-3 h-3 mr-1" /> Scan Tambah
                    </button>
                    <button type="button" onClick={addEquipmentRow} className="text-xs text-blue-600 hover:underline flex items-center font-medium">
                      <Plus className="w-3 h-3 mr-1" /> Tambah Manual
                    </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {formData.inventoryIds.map((selectedId, index) => (
                    <div key={index} className="flex gap-2 animate-fade-in-up">
                      {editingMovementId ? (
                        <input 
                          type="text" 
                          disabled 
                          value={getEquipmentName(selectedId)} 
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed flex-1" 
                        />
                      ) : (
                        <>
                          <SearchableSelect
                            options={getEquipmentOptions(selectedId)}
                            value={selectedId}
                            onChange={(val) => {
                              const item = equipment.find(eq => eq.id === val);
                              updateEquipmentRow(index, val);
                              if (index === 0 && item?.location) {
                                 setFormData(prev => ({...prev, fromLocation: item.location || prev.fromLocation}));
                              }
                            }}
                            placeholder="-- Pilih Barang --"
                            searchPlaceholder="Cari nama barang..."
                            required
                            className="flex-1"
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              setScanningRowIndex(index);
                              setIsScannerOpen(true);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Scan QR untuk baris ini"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {formData.inventoryIds.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeEquipmentRow(index)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal</label>
                  <input 
                    type="date" required
                    value={formData.movementDate}
                    onChange={(e) => setFormData({...formData, movementDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah</label>
                  <input 
                    type="number" min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dari Siapa</label>
                  <input 
                    type="text"
                    list="people-list"
                    value={formData.fromPerson}
                    onChange={(e) => setFormData({...formData, fromPerson: e.target.value})}
                    placeholder="Contoh: Laboran, Gudang"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kepada Siapa</label>
                  <input 
                    type="text" required
                    list="people-list"
                    value={formData.toPerson}
                    onChange={(e) => setFormData({...formData, toPerson: e.target.value})}
                    placeholder="Nama Penerima"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasi Asal</label>
                  <input 
                    type="text"
                    value={formData.fromLocation || equipment.find(e => e.id === formData.inventoryIds[0])?.location || ''}
                    onChange={(e) => setFormData({...formData, fromLocation: e.target.value})}
                    placeholder="Rak/Gudang"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lokasi Tujuan</label>
                  <input 
                    type="text"
                    value={formData.toLocation}
                    onChange={(e) => setFormData({...formData, toLocation: e.target.value})}
                    placeholder="Rak/Ruang Baru"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Petugas / Staff</label>
                <input 
                  type="text" required
                  list="people-list"
                  value={formData.movedBy}
                  onChange={(e) => setFormData({...formData, movedBy: e.target.value})}
                  placeholder="Nama Petugas"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Keterangan</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Catatan tambahan..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center">
                  <Save className="w-4 h-4 mr-2" /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Detail Perpindahan
              </h3>
              <button onClick={() => setSelectedMovement(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedMovement.inventoryName || getEquipmentName(selectedMovement.inventoryId)}</h2>
                <p className="text-sm font-mono text-gray-500 mt-1">{selectedMovement.inventoryId}</p>
                <div className="mt-2">
                  {renderTypeBadge(selectedMovement.movementType)}
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Tanggal</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDateID(selectedMovement.movementDate)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Jumlah</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedMovement.quantity} unit</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Dari</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedMovement.fromPerson || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Kepada</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedMovement.toPerson || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Lokasi Sebelum</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedMovement.fromLocation || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Lokasi Sekarang</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedMovement.toLocation || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                  <span className="text-gray-500 dark:text-gray-400">Petugas</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedMovement.movedBy || '-'}</span>
                </div>
                {selectedMovement.notes && (
                  <div className="pt-2">
                    <span className="text-gray-500 dark:text-gray-400 block mb-1">Keterangan</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedMovement.notes}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button onClick={() => setSelectedMovement(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isUndoModalOpen}
        onClose={() => {
          setIsUndoModalOpen(false);
          setUndoTargetId(null);
        }}
        onConfirm={confirmUndo}
        title="Batalkan Perpindahan"
        message="Apakah Anda yakin ingin membatalkan perpindahan ini? Lokasi barang akan dikembalikan ke posisi sebelumnya."
        confirmText="Ya, Batalkan"
        cancelText="Tutup"
        type="warning"
        isLoading={isUndoing}
      />

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="Scan QR Code Barang"
        closeOnSuccess={scanningRowIndex !== null}
      />
    </div>
  );
};

export default ItemMovements;
