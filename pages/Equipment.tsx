import React, { useState } from 'react';
import { MOCK_LOANS, MOCK_EQUIPMENT } from '../services/mockData';
import { Role, Loan } from '../types';
import { Search, Filter, Plus, Check, X, Clock, Box, User, Save, Trash2, CreditCard } from 'lucide-react';

interface EquipmentProps {
  role: Role;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const Equipment: React.FC<EquipmentProps> = ({ role, showToast }) => {
  const [loans, setLoans] = useState<Loan[]>(MOCK_LOANS);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    equipmentId: '',
    borrowerName: '',
    guarantee: 'KTM',
    nim: '',
    returnDate: ''
  });

  // Derived data - recalculated on every render
  const availableEquipment = MOCK_EQUIPMENT.filter(e => e.isAvailable);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Dipinjam': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Dikembalikan': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Terlambat': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReturnItem = (id: string) => {
    if (confirm("Konfirmasi pengembalian barang ini?")) {
      const today = new Date().toISOString().split('T')[0];
      
      const loan = loans.find(l => l.id === id);
      if (loan) {
         // Update Mock Equipment Availability
         const eqIndex = MOCK_EQUIPMENT.findIndex(e => e.id === loan.equipmentId);
         if (eqIndex !== -1) {
             MOCK_EQUIPMENT[eqIndex].isAvailable = true;
         }
      }

      // Update Mock Loans for persistence
      const loanIndex = MOCK_LOANS.findIndex(l => l.id === id);
      if (loanIndex !== -1) {
          MOCK_LOANS[loanIndex] = { ...MOCK_LOANS[loanIndex], status: 'Dikembalikan', actualReturnDate: today } as Loan;
      }

      // Update Local State
      setLoans(prev => prev.map(l => 
        l.id === id ? { ...l, status: 'Dikembalikan', actualReturnDate: today } as Loan : l
      ));

      showToast("Barang berhasil dikembalikan.", "success");
    }
  };

  const handleDeleteLoan = (id: string) => {
    if (confirm("Hapus riwayat peminjaman ini? Data tidak dapat dikembalikan.")) {
      const loanToDelete = loans.find(l => l.id === id);

      // If deleting an active loan, make equipment available again
      if (loanToDelete && loanToDelete.status === 'Dipinjam') {
          const eqIndex = MOCK_EQUIPMENT.findIndex(e => e.id === loanToDelete.equipmentId);
          if (eqIndex !== -1) {
              MOCK_EQUIPMENT[eqIndex].isAvailable = true;
          }
      }

      // Update Mock Loans
      const loanIndex = MOCK_LOANS.findIndex(l => l.id === id);
      if (loanIndex !== -1) {
          MOCK_LOANS.splice(loanIndex, 1);
      }

      // Update Local State
      setLoans(prev => prev.filter(loan => loan.id !== id));
      showToast("Data peminjaman dihapus.", "info");
    }
  };

  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi
    if (!formData.equipmentId || !formData.borrowerName || !formData.returnDate) {
      showToast("Mohon lengkapi data peminjaman.", "error");
      return;
    }

    if (formData.guarantee === 'KTM' && !formData.nim.trim()) {
       showToast("NIM wajib diisi jika jaminan adalah KTM.", "error");
       return;
    }

    const equipmentIndex = MOCK_EQUIPMENT.findIndex(e => e.id === formData.equipmentId);
    if (equipmentIndex === -1) return;
    const equipment = MOCK_EQUIPMENT[equipmentIndex];

    // Combine Name and NIM if KTM
    const displayName = formData.guarantee === 'KTM' 
        ? `${formData.borrowerName} (${formData.nim})` 
        : formData.borrowerName;

    const newLoan: Loan = {
      id: `L-${Date.now()}`,
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      borrowerName: displayName,
      officerName: role === Role.ADMIN ? 'Admin' : 'Laboran',
      guarantee: formData.guarantee,
      borrowDate: new Date().toISOString().split('T')[0],
      returnDate: formData.returnDate,
      status: 'Dipinjam'
    };

    // Update Mock Equipment (Availability)
    MOCK_EQUIPMENT[equipmentIndex].isAvailable = false;

    // Update Mock Loans
    MOCK_LOANS.unshift(newLoan);

    // Update Local State
    setLoans([newLoan, ...loans]);

    setIsModalOpen(false);
    setFormData({ equipmentId: '', borrowerName: '', guarantee: 'KTM', nim: '', returnDate: '' });
    showToast("Peminjaman berhasil dicatat.", "success");
  };

  const filteredLoans = loans.filter(loan => {
      const matchesSearch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            loan.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'All' || loan.status === filter;
      return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Peminjaman Barang</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola sirkulasi peminjaman inventaris</p>
        </div>
        <button 
             onClick={() => setIsModalOpen(true)}
             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium shadow-sm transition-all hover:scale-105"
        >
              <Plus className="w-4 h-4 mr-2" /> Peminjaman Baru
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
           <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama peminjam atau barang..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
              />
           </div>
           
           <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                className="bg-transparent text-sm border-none focus:ring-0 text-gray-600 dark:text-gray-300 cursor-pointer outline-none"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="All">Semua Status</option>
                <option value="Dipinjam">Dipinjam</option>
                <option value="Dikembalikan">Dikembalikan</option>
              </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Barang</th>
                <th className="px-6 py-4">Peminjam</th>
                <th className="px-6 py-4">Tgl Pinjam</th>
                <th className="px-6 py-4">Tgl Kembali</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLoans.length > 0 ? filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{loan.equipmentName}</div>
                    <div className="text-xs text-gray-500">{loan.equipmentId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 dark:text-white font-medium">{loan.borrowerName}</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mt-1">
                        Jaminan: {loan.guarantee}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{loan.borrowDate}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{loan.returnDate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                        {loan.status === 'Dipinjam' ? (
                           <button 
                             onClick={() => handleReturnItem(loan.id)}
                             className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center shadow-sm transition-colors"
                             title="Proses Pengembalian"
                           >
                              <Check className="w-3 h-3 mr-1" /> Kembalikan
                           </button>
                        ) : (
                            <span className="text-gray-400 text-xs flex items-center px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
                                <Clock className="w-3 h-3 mr-1"/> Selesai
                            </span>
                        )}
                        
                        <button 
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Hapus Data"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              )) : (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                       <div className="flex flex-col items-center">
                          <Box className="w-10 h-10 text-gray-300 mb-2" />
                          <p>Tidak ada data peminjaman.</p>
                       </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-blue-600" />
                    Input Peminjaman Baru
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleSubmitLoan} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Barang</label>
                    <div className="relative">
                       <Box className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                       <select 
                          required
                          value={formData.equipmentId}
                          onChange={(e) => setFormData({...formData, equipmentId: e.target.value})}
                          className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                       >
                          <option value="">-- Pilih Barang --</option>
                          {availableEquipment.map(item => (
                             <option key={item.id} value={item.id}>
                                {item.name} ({item.code})
                             </option>
                          ))}
                       </select>
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Peminjam</label>
                    <div className="relative">
                       <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                       <input 
                          type="text" required
                          value={formData.borrowerName}
                          onChange={(e) => setFormData({...formData, borrowerName: e.target.value})}
                          placeholder="Nama Mahasiswa / Dosen"
                          className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Jaminan</label>
                        <select 
                            value={formData.guarantee}
                            onChange={(e) => setFormData({...formData, guarantee: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="KTM">KTM</option>
                            <option value="KTP">KTP</option>
                            <option value="SIM">SIM</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tgl Kembali</label>
                        <input 
                            type="date" required
                            value={formData.returnDate}
                            onChange={(e) => setFormData({...formData, returnDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                 </div>

                 {/* NIM Input - Conditionally Rendered */}
                 {formData.guarantee === 'KTM' && (
                     <div className="animate-fade-in-up bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                        <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">NIM (Nomor Induk Mahasiswa)</label>
                        <div className="relative">
                            <CreditCard className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                            <input 
                                type="text" 
                                required
                                value={formData.nim}
                                onChange={(e) => setFormData({...formData, nim: e.target.value})}
                                placeholder="Cth: 672019xxx"
                                className="w-full pl-9 pr-4 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                            />
                        </div>
                     </div>
                 )}

                 <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                       Batal
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all">
                       <Save className="w-4 h-4 mr-2" /> Simpan Data
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Equipment;