import React, { useState } from 'react';
import { MOCK_EQUIPMENT } from '../services/mockData';
import { Equipment } from '../types';
import { Search, Plus, Filter, Edit, Trash2, X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';

const Inventory: React.FC = () => {
  const [items, setItems] = useState<Equipment[]>(MOCK_EQUIPMENT);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState<'All' | 'Baik' | 'Rusak Ringan' | 'Rusak Berat'>('All');

  // Modal State for Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<Partial<Equipment>>({
    name: '', code: '', category: '', condition: 'Baik', isAvailable: true, image: ''
  });

  // Modal State for Delete Confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = filterCondition === 'All' || item.condition === filterCondition;
    return matchesSearch && matchesCondition;
  });

  const handleOpenModal = (item?: Equipment) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ name: '', code: '', category: '', condition: 'Baik', isAvailable: true, image: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...formData } as Equipment : i));
    } else {
      const newItem: Equipment = {
        ...formData,
        id: `E${Date.now()}`,
      } as Equipment;
      setItems(prev => [...prev, newItem]);
    }
    setIsModalOpen(false);
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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
         <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nama atau kode barang..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
            />
         </div>
         <div className="flex gap-2 w-full sm:w-auto items-center">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                  <div className="h-40 bg-gray-100 dark:bg-gray-900 relative">
                      {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-10 h-10" />
                          </div>
                      )}
                      {/* Action Buttons Overlay - Always visible on touch, hover on desktop */}
                      <div className="absolute top-2 right-2 flex space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-black/50 p-1 rounded-lg backdrop-blur-sm shadow-sm z-10">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} 
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                            title="Edit Barang"
                          >
                              <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }} 
                            className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="Hapus Barang"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                      <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-xs font-bold border ${getConditionColor(item.condition)}`}>
                          {item.condition}
                      </div>
                  </div>
                  <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{item.code}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${item.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} title={item.isAvailable ? 'Tersedia' : 'Tidak Tersedia'}></span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white truncate" title={item.name}>{item.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.category}</p>
                  </div>
              </div>
          ))}
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
              <form onSubmit={handleSave} className="p-6 space-y-4">
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode Inventaris</label>
                        <input 
                            type="text" required 
                            value={formData.code} 
                            onChange={e => setFormData({...formData, code: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                            placeholder="PRJ-001"
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

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Gambar (Opsional)</label>
                    <input 
                        type="text" 
                        value={formData.image} 
                        onChange={e => setFormData({...formData, image: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="https://..."
                    />
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