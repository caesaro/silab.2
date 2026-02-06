import React, { useState } from 'react';
import { MOCK_LAB_STAFF } from '../services/mockData';
import { LabStaff } from '../types';
import { Search, Plus, Printer, Download, Edit, Trash2, X, Check, FileSpreadsheet } from 'lucide-react';

const LaboranManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<LabStaff[]>(MOCK_LAB_STAFF);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Aktif' | 'Non-Aktif'>('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<LabStaff | null>(null);
  const [formData, setFormData] = useState<Partial<LabStaff>>({
    name: '', nim: '', email: '', phone: '', type: 'Teknisi', status: 'Aktif'
  });

  // Filter Data
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          staff.nim.includes(searchTerm);
    const matchesStatus = filterStatus === 'All' || staff.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Nama", "NIM", "Email", "No HP", "Tipe", "Status"];
    const rows = filteredStaff.map(s => [s.id, s.name, s.nim, s.email, s.phone, s.type, s.status]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "data_laboran_fti.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // CRUD Operations
  const handleOpenModal = (staff?: LabStaff) => {
    if (staff) {
      setEditingStaff(staff);
      setFormData(staff);
    } else {
      setEditingStaff(null);
      setFormData({ name: '', nim: '', email: '', phone: '', type: 'Teknisi', status: 'Aktif' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      // Update
      setStaffList(prev => prev.map(s => s.id === editingStaff.id ? { ...s, ...formData } as LabStaff : s));
    } else {
      // Create
      const newStaff: LabStaff = {
        ...formData,
        id: Date.now().toString(),
      } as LabStaff;
      setStaffList(prev => [...prev, newStaff]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data laboran ini?")) {
      setStaffList(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Print Report Header - Only visible when printing */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center space-x-4">
               {/* Placeholder for Logo */}
               <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xl font-bold border border-gray-400">FTI</div>
               <div>
                   <h1 className="text-2xl font-bold uppercase">Fakultas Teknologi Informasi</h1>
                   <h2 className="text-xl">Universitas Kristen Satya Wacana</h2>
                   <p className="text-sm">Jl. Diponegoro 52-60 Salatiga - Jawa Tengah 50711</p>
               </div>
           </div>
           <div className="text-right">
               <h3 className="text-xl font-bold">DATA LABORAN</h3>
               <p className="text-sm">Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
           </div>
        </div>
      </div>

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Laboran</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola data teknisi dan admin laboran</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={handleExportCSV} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
           </button>
           <button onClick={handlePrint} className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
              <Printer className="w-4 h-4 mr-2" /> Print Data
           </button>
           <button onClick={() => handleOpenModal()} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
              <Plus className="w-4 h-4 mr-2" /> Tambah Laboran
           </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-4 justify-between items-center print:border-none print:shadow-none print:p-0">
         <div className="relative w-full sm:w-64 print:hidden">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nama atau NIM..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
            />
         </div>
         <div className="flex gap-2 w-full sm:w-auto print:hidden">
             {['All', 'Aktif', 'Non-Aktif'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    filterStatus === status 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 font-medium' 
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                   {status}
                </button>
             ))}
         </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-black print:border-2">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 print:bg-gray-200 print:text-black">
                  <tr>
                     <th className="px-6 py-4">Nama & NIM</th>
                     <th className="px-6 py-4">Kontak</th>
                     <th className="px-6 py-4">Tipe</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 print:hidden">Aksi</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-200 dark:divide-gray-700 print:divide-gray-400">
                  {filteredStaff.length > 0 ? filteredStaff.map((staff) => (
                     <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                           <div className="font-bold text-gray-900 dark:text-white">{staff.name}</div>
                           <div className="text-xs text-gray-500 font-mono">{staff.nim}</div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-gray-900 dark:text-gray-300">{staff.email}</div>
                           <div className="text-xs text-gray-500">{staff.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-md text-xs font-medium print:border print:border-gray-300 ${staff.type === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                              {staff.type}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium print:border print:border-gray-300 ${staff.status === 'Aktif' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 print:hidden ${staff.status === 'Aktif' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {staff.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 print:hidden">
                           <div className="flex space-x-2">
                              <button onClick={() => handleOpenModal(staff)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/30 transition-colors" title="Edit">
                                 <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(staff.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30 transition-colors" title="Hapus">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </td>
                     </tr>
                  )) : (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                           Tidak ada data laboran yang ditemukan.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white">
                    {editingStaff ? 'Edit Data Laboran' : 'Tambah Laboran Baru'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                       <input 
                         type="text" required 
                         value={formData.name} 
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                         placeholder="Contoh: John Doe"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIM</label>
                       <input 
                         type="text" required 
                         value={formData.nim} 
                         onChange={e => setFormData({...formData, nim: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                         placeholder="Contoh: 672019xxx"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. HP</label>
                       <input 
                         type="text" required 
                         value={formData.phone} 
                         onChange={e => setFormData({...formData, phone: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                         placeholder="08xxxxxxxx"
                       />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                       <input 
                         type="email" required 
                         value={formData.email} 
                         onChange={e => setFormData({...formData, email: e.target.value})}
                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-shadow"
                         placeholder="email@uksw.edu"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe</label>
                       <select 
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value as any})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                       >
                          <option value="Teknisi">Teknisi</option>
                          <option value="Admin">Admin</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                       <select 
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                       >
                          <option value="Aktif">Aktif</option>
                          <option value="Non-Aktif">Non-Aktif</option>
                       </select>
                    </div>
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
    </div>
  );
};

export default LaboranManagement;
