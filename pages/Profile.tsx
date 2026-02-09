import React, { useState } from 'react';
import { Role } from '../types';
import { User, Mail, Phone, MapPin, Shield, Save, Lock, Building, CreditCard, X, KeyRound } from 'lucide-react';

interface ProfileProps {
  role: Role;
}

const Profile: React.FC<ProfileProps> = ({ role }) => {
  // Mock data based on role
  const initialData = role === Role.USER ? {
    name: 'John Doe',
    email: 'john.doe@student.uksw.edu',
    nim: '672019001',
    department: 'Teknik Informatika',
    phone: '081234567890',
    address: 'Jl. Diponegoro No. 52, Salatiga',
    avatar: `https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff`
  } : role === Role.ADMIN ? {
    name: 'Administrator FTI',
    email: 'admin.fti@uksw.edu',
    nim: '999999',
    department: 'Biro Administrasi FTI',
    phone: '0298-321212',
    address: 'Gedung FTI Lt. 1, Kampus Notohamidjojo',
    avatar: `https://ui-avatars.com/api/?name=Admin+FTI&background=0D8ABC&color=fff`
  } : {
    name: 'Bpk. Budi Santoso',
    email: 'budi@uksw.edu',
    nim: '672005001',
    department: 'Laboratorium',
    phone: '08123456789',
    address: 'Salatiga',
    avatar: `https://ui-avatars.com/api/?name=Budi+Santoso&background=0D8ABC&color=fff`
  };

  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(initialData);

  // Password Change State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    // In real app, API call here
    alert("Profil berhasil diperbarui!");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      alert("Mohon lengkapi semua field password.");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      alert("Password baru dan konfirmasi tidak cocok!");
      return;
    }
    // Mock API call
    alert("Password berhasil diubah!");
    setIsChangePasswordOpen(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
       {/* Header / Cover */}
       <div className="relative rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div className="px-6 pb-6">
             <div className="relative flex items-end -mt-12 mb-4">
                <div className="relative">
                   <img src={userData.avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-md bg-white" />
                </div>
                <div className="ml-4 mb-1">
                   <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{userData.name}</h1>
                   <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center">
                      <Shield className="w-3 h-3 mr-1 text-blue-500" /> {role}
                   </p>
                </div>
                <div className="ml-auto mb-2 hidden sm:block">
                   {!isEditing ? (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                         Edit Profil
                      </button>
                   ) : (
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium mr-2"
                      >
                         Batal
                      </button>
                   )}
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Personal Info */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-lg font-bold text-gray-900 dark:text-white">Informasi Pribadi</h2>
                   {isEditing && (
                      <button 
                        onClick={handleSave}
                        className="flex items-center text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                         <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
                      </button>
                   )}
                </div>
                
                <form className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nama Lengkap</label>
                         <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text" 
                              disabled={!isEditing}
                              value={userData.name}
                              onChange={e => setUserData({...userData, name: e.target.value})}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase mb-1">{role === Role.USER ? 'NIM' : 'NIDN/NIP'}</label>
                         <div className="relative">
                            <CreditCard className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text" 
                              disabled={!isEditing}
                              value={userData.nim}
                              onChange={e => setUserData({...userData, nim: e.target.value})}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email UKSW</label>
                         <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                              type="email" 
                              disabled={!isEditing}
                              value={userData.email}
                              onChange={e => setUserData({...userData, email: e.target.value})}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nomor Telepon/WA</label>
                         <div className="relative">
                            <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text" 
                              disabled={!isEditing}
                              value={userData.phone}
                              onChange={e => setUserData({...userData, phone: e.target.value})}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            />
                         </div>
                      </div>
                      <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Fakultas / Program Studi</label>
                         <div className="relative">
                            <Building className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text" 
                              disabled={!isEditing}
                              value={userData.department}
                              onChange={e => setUserData({...userData, department: e.target.value})}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            />
                         </div>
                      </div>
                      <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Alamat Domisili</label>
                         <div className="relative">
                            <MapPin className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                              type="text" 
                              disabled={!isEditing}
                              value={userData.address}
                              onChange={e => setUserData({...userData, address: e.target.value})}
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            />
                         </div>
                      </div>
                   </div>
                </form>
             </div>
          </div>

          {/* Right Column: Settings */}
          <div className="space-y-6">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                 <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Keamanan Akun</h2>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                       <div className="flex items-center">
                          <Lock className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                             <p className="text-sm font-medium text-gray-900 dark:text-white">Password</p>
                             <p className="text-xs text-gray-500">Terakhir diubah 3 bulan lalu</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => setIsChangePasswordOpen(true)}
                         className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                       >
                         Ubah
                       </button>
                    </div>
                 </div>
             </div>

             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                 <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Statistik Saya</h2>
                 <div className="grid grid-cols-2 gap-4 text-center">
                     <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">12</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Peminjaman</span>
                     </div>
                     <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="block text-2xl font-bold text-green-600 dark:text-green-400">0</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Pelanggaran</span>
                     </div>
                 </div>
             </div>
          </div>
       </div>

       {/* Change Password Modal */}
       {isChangePasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                   <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                      <KeyRound className="w-5 h-5 mr-2 text-blue-600" />
                      Ubah Password
                   </h3>
                   <button 
                     onClick={() => setIsChangePasswordOpen(false)}
                     className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                   >
                      <X className="w-5 h-5" />
                   </button>
                </div>
                <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password Saat Ini</label>
                      <input 
                        type="password" required 
                        value={passwordForm.current}
                        onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password Baru</label>
                      <input 
                        type="password" required 
                        value={passwordForm.new}
                        onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konfirmasi Password Baru</label>
                      <input 
                        type="password" required 
                        value={passwordForm.confirm}
                        onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                   </div>
                   <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                      <button 
                        type="button" 
                        onClick={() => setIsChangePasswordOpen(false)}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                         Batal
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all"
                      >
                         Simpan Password
                      </button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Profile;