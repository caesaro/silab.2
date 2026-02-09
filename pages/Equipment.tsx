import React, { useState } from 'react';
import { MOCK_LOANS, MOCK_EQUIPMENT } from '../services/mockData';
import { Role, Loan } from '../types';
import { Search, Filter, Plus, Check, X, Clock, Box, User, Save, Trash2, CreditCard, Eye, Calendar } from 'lucide-react';

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
  const [formData, setFormData] = useState<{equipmentIds: string[], borrowerName: string, guarantee: string, nim: string, borrowDate: string, borrowTime: string}>({
    equipmentIds: [''],
    borrowerName: '',
    guarantee: 'KTM',
    nim: '',
    borrowDate: new Date().toISOString().split('T')[0], // Default hari ini
    borrowTime: new Date().toTimeString().slice(0, 5)   // Default jam sekarang
  });

  // Detail & Return Modal State
  const [selectedGroup, setSelectedGroup] = useState<{key: string, loans: Loan[]} | null>(null);
  const [returnConfirmation, setReturnConfirmation] = useState<{loan: Loan, returnTime: string, returnDate: string} | null>(null);

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

  const initiateReturn = (loan: Loan) => {
    const now = new Date();
    setReturnConfirmation({
        loan,
        returnDate: now.toLocaleDateString('en-CA'), // YYYY-MM-DD
        returnTime: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    });
  };

  const confirmReturn = () => {
    if (!returnConfirmation) return;

    const { loan, returnDate, returnTime } = returnConfirmation;
    
    // Update Mock Equipment Availability
    const eqIndex = MOCK_EQUIPMENT.findIndex(e => e.id === loan.equipmentId);
    if (eqIndex !== -1) {
        MOCK_EQUIPMENT[eqIndex].isAvailable = true;
    }

    // Update Local State
    setLoans(prev => prev.map(l => 
        l.id === loan.id ? { ...l, status: 'Dikembalikan', actualReturnDate: returnDate, actualReturnTime: returnTime } as Loan : l
    ));

    // Update Mock Loans (Persistence Simulation)
    const loanIndex = MOCK_LOANS.findIndex(l => l.id === loan.id);
    if (loanIndex !== -1) {
        MOCK_LOANS[loanIndex].status = 'Dikembalikan';
        MOCK_LOANS[loanIndex].actualReturnDate = returnDate;
        MOCK_LOANS[loanIndex].actualReturnTime = returnTime;
    }
  };

  const handleDeleteGroup = (groupLoans: Loan[]) => {
    if (confirm(`Hapus riwayat peminjaman untuk ${groupLoans.length} barang ini? Data tidak dapat dikembalikan.`)) {
      
      groupLoans.forEach(loanToDelete => {
          // If deleting an active loan, make equipment available again
          if (loanToDelete.status === 'Dipinjam') {
              const eqIndex = MOCK_EQUIPMENT.findIndex(e => e.id === loanToDelete.equipmentId);
              if (eqIndex !== -1) {
                  MOCK_EQUIPMENT[eqIndex].isAvailable = true;
              }
          }

          // Update Mock Loans
          const loanIndex = MOCK_LOANS.findIndex(l => l.id === loanToDelete.id);
          if (loanIndex !== -1) {
              MOCK_LOANS.splice(loanIndex, 1);
          }
      });

      // Update Local State
      const idsToDelete = groupLoans.map(l => l.id);
      setLoans(prev => prev.filter(loan => !idsToDelete.includes(loan.id)));
      
      showToast("Data peminjaman dihapus.", "info");
    }
  };

  const addEquipmentRow = () => {
    setFormData(prev => ({ ...prev, equipmentIds: [...prev.equipmentIds, ''] }));
  };

  const removeEquipmentRow = (index: number) => {
    if (formData.equipmentIds.length > 1) {
      setFormData(prev => ({
        ...prev,
        equipmentIds: prev.equipmentIds.filter((_, i) => i !== index)
      }));
    }
  };

  const updateEquipmentRow = (index: number, value: string) => {
    const newIds = [...formData.equipmentIds];
    newIds[index] = value;
    setFormData(prev => ({ ...prev, equipmentIds: newIds }));
  };

  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedIds = formData.equipmentIds.filter(id => id !== '');

    // Validasi
    if (selectedIds.length === 0 || !formData.borrowerName || !formData.borrowDate || !formData.borrowTime) {
      showToast("Mohon lengkapi data peminjaman.", "error");
      return;
    }

    if (formData.guarantee === 'KTM' && !formData.nim.trim()) {
       showToast("NIM wajib diisi jika jaminan adalah KTM.", "error");
       return;
    }

    // Combine Name and Identifier
    const displayName = `${formData.borrowerName} (${formData.nim})`;

    const newLoans: Loan[] = [];

    selectedIds.forEach(eqId => {
        const equipmentIndex = MOCK_EQUIPMENT.findIndex(e => e.id === eqId);
        if (equipmentIndex !== -1) {
            const equipment = MOCK_EQUIPMENT[equipmentIndex];
            
            const newLoan: Loan = {
              id: `L-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              equipmentId: equipment.id,
              equipmentName: equipment.name,
              borrowerName: displayName,
              officerName: role === Role.ADMIN ? 'Admin' : 'Laboran',
              guarantee: formData.guarantee,
              borrowDate: formData.borrowDate,
              borrowTime: formData.borrowTime,
              status: 'Dipinjam'
            };

            // Update Mock Equipment (Availability)
            MOCK_EQUIPMENT[equipmentIndex].isAvailable = false;
            newLoans.push(newLoan);
        }
    });

    // Update Mock Loans
    MOCK_LOANS.unshift(...newLoans);

    // Update Local State
    setLoans([...newLoans, ...loans]);

    setIsModalOpen(false);
    setFormData({ 
        equipmentIds: [''], 
        borrowerName: '', 
        guarantee: 'KTM', 
        nim: '', 
        borrowDate: new Date().toISOString().split('T')[0],
        borrowTime: new Date().toTimeString().slice(0, 5)
    });
    showToast(`${newLoans.length} Peminjaman berhasil dicatat.`, "success");
  };

  const filteredLoans = loans.filter(loan => {
      const matchesSearch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            loan.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'All' || loan.status === filter;
      return matchesSearch && matchesFilter;
  });

  // Group Loans by Borrower + Date + Time
  const groupedLoans = filteredLoans.reduce((groups, loan) => {
      const key = `${loan.borrowerName}|${loan.borrowDate}|${loan.borrowTime || '00:00'}`;
      if (!groups[key]) {
          groups[key] = [];
      }
      groups[key].push(loan);
      return groups;
  }, {} as Record<string, Loan[]>);

  const sortedGroupKeys = Object.keys(groupedLoans).sort((a, b) => b.localeCompare(a)); // Sort by date desc (part of key)

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
                <th className="px-6 py-4">Peminjam</th>
                <th className="px-6 py-4">Waktu Pinjam</th>
                <th className="px-6 py-4">Jumlah Barang</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedGroupKeys.length > 0 ? sortedGroupKeys.map((key) => {
                const groupLoans = groupedLoans[key];
                const firstLoan = groupLoans[0];
                const [borrowerName, borrowDate, borrowTime] = key.split('|');
                
                // Determine aggregate status
                const allReturned = groupLoans.every(l => l.status === 'Dikembalikan');
                const anyLate = groupLoans.some(l => l.status === 'Terlambat');
                const displayStatus = allReturned ? 'Dikembalikan' : (anyLate ? 'Terlambat' : 'Dipinjam');

                return (
                  <tr 
                    key={key} 
                    onClick={() => setSelectedGroup({ key, loans: groupLoans })}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">{borrowerName}</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mt-1">
                          Jaminan: {firstLoan.guarantee}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white text-sm">{borrowDate}</div>
                        <div className="text-xs text-gray-500">{borrowTime}</div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <Box className="w-3 h-3 mr-1" /> {groupLoans.length} Barang
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center justify-center mx-auto">
                            <Eye className="w-4 h-4 mr-1" /> Detail
                        </button>
                    </td>
                  </tr>
                );
              }) : (
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
                 {/* Informasi Peminjam */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Peminjam</label>
                        <div className="relative">
                           <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                           <input 
                              type="text" required
                              value={formData.borrowerName}
                              onChange={(e) => setFormData({...formData, borrowerName: e.target.value})}
                              placeholder="Nama Lengkap"
                              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                           />
                        </div>
                     </div>
                     
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Jaminan</label>
                        <select 
                            value={formData.guarantee}
                            onChange={(e) => setFormData({...formData, guarantee: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="KTM">KTM (Mahasiswa)</option>
                            <option value="KTP">KTP (Umum)</option>
                            <option value="SIM">SIM</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {formData.guarantee === 'KTM' ? 'NIM' : 
                             formData.guarantee === 'KTP' ? 'NIK' : 
                             formData.guarantee === 'SIM' ? 'No. SIM' : 'Nomor Identitas'}
                        </label>
                        <div className="relative">
                            <CreditCard className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" required
                                value={formData.nim}
                                onChange={(e) => setFormData({...formData, nim: e.target.value})}
                                placeholder={formData.guarantee === 'KTM' ? '6720xxxx' : 'Nomor Identitas'}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Pinjam</label>
                        <input 
                            type="date" required
                            value={formData.borrowDate}
                            onChange={(e) => setFormData({...formData, borrowDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Pinjam</label>
                        <input 
                            type="time" required
                            value={formData.borrowTime}
                            onChange={(e) => setFormData({...formData, borrowTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                 </div>

                 {/* Daftar Barang */}
                 <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Barang yang Dipinjam</label>
                        <button type="button" onClick={addEquipmentRow} className="text-xs text-blue-600 hover:underline flex items-center font-medium">
                            <Plus className="w-3 h-3 mr-1" /> Tambah Barang
                        </button>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {formData.equipmentIds.map((selectedId, index) => (
                            <div key={index} className="flex gap-2 animate-fade-in-up">
                                <div className="relative flex-1">
                                   <Box className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                   <select 
                                      required
                                      value={selectedId}
                                      onChange={(e) => updateEquipmentRow(index, e.target.value)}
                                      className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                                   >
                                      <option value="">-- Pilih Barang --</option>
                                      {availableEquipment.map(item => (
                                         <option 
                                            key={item.id} 
                                            value={item.id}
                                            disabled={formData.equipmentIds.includes(item.id) && item.id !== selectedId}
                                         >
                                            {item.name} ({item.id})
                                         </option>
                                      ))}
                                   </select>
                                </div>
                                {formData.equipmentIds.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => removeEquipmentRow(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Hapus baris"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                 </div>

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

      {/* Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Detail Peminjaman
                 </h3>
                 <button onClick={() => setSelectedGroup(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-6">
                  <div className="flex justify-between items-start mb-6 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                      <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Peminjam</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedGroup.loans[0].borrowerName}</p>
                          <p className="text-xs text-gray-500 mt-1">Jaminan: {selectedGroup.loans[0].guarantee}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Waktu Pinjam</p>
                          <p className="text-md font-medium text-gray-900 dark:text-white flex items-center justify-end">
                              <Calendar className="w-4 h-4 mr-1" /> {selectedGroup.loans[0].borrowDate}
                          </p>
                          <p className="text-md font-medium text-gray-900 dark:text-white flex items-center justify-end mt-1">
                              <Clock className="w-4 h-4 mr-1" /> {selectedGroup.loans[0].borrowTime || '-'}
                          </p>
                      </div>
                  </div>

                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Daftar Barang Dipinjam</h4>
                  <div className="space-y-3">
                      {selectedGroup.loans.map((loan) => (
                          <div key={loan.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <div className="flex items-center">
                                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                                      <Box className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{loan.equipmentName}</p>
                                      <p className="text-xs text-gray-500">ID: {loan.equipmentId}</p>
                                  </div>
                              </div>
                              <div>
                                  {loan.status === 'Dipinjam' ? (
                                      <button 
                                        onClick={() => initiateReturn(loan)}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center"
                                      >
                                          <Check className="w-3 h-3 mr-1" /> Kembalikan
                                      </button>
                                  ) : (
                                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded flex items-center">
                                          <Check className="w-3 h-3 mr-1" /> Dikembalikan
                                      </span>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between">
                  <button 
                    onClick={() => {
                        handleDeleteGroup(selectedGroup.loans);
                        setSelectedGroup(null);
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                  >
                      <Trash2 className="w-4 h-4 mr-1" /> Hapus Riwayat
                  </button>
                  <button onClick={() => setSelectedGroup(null)} className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-500">
                      Tutup
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {returnConfirmation && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Konfirmasi Pengembalian</h3>
                  <div className="space-y-3 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Barang</p>
                          <p className="font-medium text-gray-900 dark:text-white">{returnConfirmation.loan.equipmentName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Kembali</label>
                              <input 
                                type="date" 
                                value={returnConfirmation.returnDate}
                                onChange={e => setReturnConfirmation({...returnConfirmation, returnDate: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Kembali</label>
                              <input 
                                type="time" 
                                value={returnConfirmation.returnTime}
                                onChange={e => setReturnConfirmation({...returnConfirmation, returnTime: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                          </div>
                      </div>
                  </div>
                  <div className="flex space-x-3">
                      <button onClick={() => setReturnConfirmation(null)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Batal</button>
                      <button 
                        onClick={() => {
                            confirmReturn();
                            setReturnConfirmation(null);
                            showToast("Barang berhasil dikembalikan", "success");
                        }} 
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                          Konfirmasi
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Equipment;