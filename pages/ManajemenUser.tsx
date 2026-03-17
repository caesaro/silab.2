import React, { useState, useEffect, useMemo } from 'react';
import { AppUser as BaseAppUser } from '../types';
import { Search, Plus, Filter, Edit, Trash2, X, Check, MoreHorizontal, UserCheck, UserX, Shield, KeyRound, RefreshCw, Loader2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';

// Extend AppUser type locally to include phone
type AppUser = BaseAppUser & { phone?: string };

interface UserManagementProps {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ showToast }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | 'Mahasiswa' | 'Dosen'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Aktif' | 'Non-Aktif' | 'Suspended'>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'internal' | 'sso'>('internal');
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState<Partial<AppUser>>({
    name: '', email: '', username: '', role: 'User', identifier: '', phone: '', status: 'Aktif'
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', type: 'danger' as 'danger' | 'warning' | 'info', targetId: '', actionType: ''
  });
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Mengambil data dari backend server dengan filter tipe user
      const response = await api(`/api/users?type=${activeTab}`);
      if (response.ok) {
        const data = await response.json();
        // Filter agar user dengan role ADMIN tidak muncul di list (Hanya bisa dimanipulasi di DB)
        const nonAdminUsers = data.filter((u: AppUser) => u.role !== 'Admin');
        setUsers(nonAdminUsers);
      } else {
        console.error("Gagal mengambil data users");
      }
    } catch (error) {
      console.error("Error koneksi ke server:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            user.identifier.includes(searchTerm) ||
                            (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'All' || user.role === filterRole;
      const matchesStatus = filterStatus === 'All' || user.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterStatus, itemsPerPage, activeTab]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleOpenModal = (user?: AppUser) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', username: '', role: 'User', identifier: '', phone: '', status: 'Aktif' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update
        const res = await api(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          data: formData
        });
        if (res.ok) {
          fetchUsers();
          showToast("Data user berhasil diperbarui.", "success");
        }
      } else {
        // Create
        const res = await api('/api/users', {
          method: 'POST',
          data: formData
        });
        if (res.ok) {
          fetchUsers();
          showToast("User baru berhasil ditambahkan.", "success");
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      showToast("Gagal menyimpan data user.", "error");
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus User',
      message: 'Apakah Anda yakin ingin menghapus user ini? Data tidak dapat dikembalikan.',
      type: 'danger',
      targetId: id,
      actionType: 'delete'
    });
  };

  const toggleStatus = async (user: AppUser) => {
      const newStatus = user.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
      
      try {
        const response = await api(`/api/users/${user.id}/status`, {
          method: 'PUT',
          data: { status: newStatus }
        });

        if (response.ok) {
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
          showToast(`Status user berhasil diubah menjadi ${newStatus}.`, "success");
        } else {
          showToast("Gagal mengubah status user.", "error");
        }
      } catch (error) {
        console.error("Error updating status:", error);
        showToast("Gagal mengubah status user.", "error");
      }
  };

  const handleResetPasswordClick = (user: AppUser) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Password',
      message: `Reset password untuk user ${user.name}? User akan diminta membuat password baru saat login berikutnya.`,
      type: 'warning',
      targetId: user.id,
      actionType: 'reset'
    });
  };

  const executeConfirmAction = async () => {
    setIsConfirming(true);
    try {
      if (confirmModal.actionType === 'delete') {
        await api(`/api/users/${confirmModal.targetId}`, { method: 'DELETE' });
        showToast("User berhasil dihapus.", "success");
      } else if (confirmModal.actionType === 'reset') {
        await api(`/api/users/${confirmModal.targetId}/reset-password`, { method: 'PUT' });
        showToast("Password berhasil direset.", "success");
      }
      fetchUsers();
    } catch (error) {
      showToast("Terjadi kesalahan saat memproses permintaan.", "error");
    } finally {
      setIsConfirming(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen User</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola data mahasiswa, dosen, dan pengguna sistem lainnya</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
           <Plus className="w-4 h-4 mr-2" /> Tambah User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
         {/* Tab Navigation */}
         <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
               onClick={() => setActiveTab('internal')}
               className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'internal'
                     ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
                     : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
               }`}
            >
               Internal
            </button>
            <button
               onClick={() => setActiveTab('sso')}
               className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'sso'
                     ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
                     : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
               }`}
            >
               SSO
            </button>
         </div>

         <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari Nama / NIM / Email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
            />
         </div>
         <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
             <button 
                onClick={fetchUsers} 
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Data"
             >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
             </button>
             <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Role:</span>
                <select 
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                    className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="All">Semua</option>
                    <option value="Mahasiswa">Mahasiswa</option>
                    <option value="Dosen">Dosen</option>
                </select>
             </div>
             <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Status:</span>
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="All">Semua</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                    <option value="Suspended">Suspended</option>
                </select>
             </div>
         </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                  <tr>
                     <th className="px-6 py-4">User Info</th>
                     <th className="px-6 py-4">Role & Prodi</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Last Login</th>
                     <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentUsers.length > 0 ? currentUsers.map((user) => (
                     <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center">
                               <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold mr-3">
                                   {user.name.charAt(0)}
                               </div>
                               <div>
                                   <div className="font-bold text-gray-900 dark:text-white">{user.name}</div>
                                   <div className="text-xs text-gray-500">{user.email}</div>
                                   <div className="text-xs text-blue-500">@{user.username || '-'}</div>
                                   <div className="text-xs text-gray-400 font-mono mt-0.5">{user.identifier}</div>
                               </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-gray-900 dark:text-gray-300 font-medium">{user.role}</div>
                           <div className="text-xs text-gray-500">{user.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                              ${user.status === 'Aktif' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                user.status === 'Suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {user.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                           {user.lastLogin}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => toggleStatus(user)}
                                className={`p-1.5 rounded transition-colors ${user.status === 'Aktif' ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`} 
                                title={user.status === 'Aktif' ? 'Non-aktifkan' : 'Aktifkan'}
                              >
                                 {user.status === 'Aktif' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleResetPasswordClick(user)} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded dark:hover:bg-yellow-900/30 transition-colors" title="Reset Password">
                                 <KeyRound className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleOpenModal(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/30 transition-colors" title="Edit">
                                 <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteClick(user.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/30 transition-colors" title="Hapus">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </td>
                     </tr>
                  )) : (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                           <div className="flex flex-col items-center justify-center">
                              <Users className="w-12 h-12 text-gray-300 mb-3" />
                              <p>Tidak ada user yang ditemukan.</p>
                           </div>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Pagination Controls */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 rounded-b-xl shadow-sm -mt-6">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Tampilkan</span>
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
          <span>dari {filteredUsers.length} data</span>
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-full sm:max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                 <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                    {editingUser ? 'Edit User' : 'Tambah User Baru'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleSave} className="p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                    <input 
                        type="text" required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Nama User"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                    <input 
                        type="text" required 
                        value={formData.username || ''} 
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Username unik"
                    />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <select 
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value as any})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="User">User (Mahasiswa/Dosen)</option>
                            <option value="Laboran">Laboran</option>
                            <option value="Teknisi">Teknisi</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Identifier (NIM/NIDN)</label>
                        <input 
                            type="text" required 
                            value={formData.identifier} 
                            onChange={e => setFormData({...formData, identifier: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                            placeholder="672019xxx"
                        />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email UKSW</label>
                    <input 
                        type="email" required 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="nama@student.uksw.edu"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. Telepon / WA</label>
                    <input 
                        type="text" required 
                        value={formData.phone || ''} 
                        onChange={e => {
                           const val = e.target.value;
                           if (/^\d*$/.test(val)) {
                              setFormData({...formData, phone: val});
                           }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="08xxxxxxxx"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Akun</label>
                    <select 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Aktif">Aktif</option>
                        <option value="Non-Aktif">Non-Aktif</option>
                        <option value="Suspended">Suspended</option>
                    </select>
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.actionType === 'delete' ? 'Ya, Hapus' : 'Ya, Reset'}
        isLoading={isConfirming}
      />
    </div>
  );
};

export default UserManagement;
