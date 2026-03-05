import React, { useState, useEffect, useRef } from 'react';
import { Database, Server, Lock, Globe, Save, RefreshCw, Eye, EyeOff, CheckCircle, AlertCircle, ShieldAlert, Power, Megaphone, Download, Upload, FileText, FileWarning } from 'lucide-react';
import { api } from '../services/api';

interface SettingsProps {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const Settings: React.FC<SettingsProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'database' | 'sso' | 'system' | 'error-log'>('database');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState({
    active: false,
    message: '',
    type: 'info'
  });
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorLog, setErrorLog] = useState('');

  // Database State
  const [dbConfig, setDbConfig] = useState({
    host: '192.168.68.62',
    port: '5432',
    database: 'dbcorefti',
    username: 'corefti',
    password: 'c0r3ft1',
  });

  // SSO State
  const [ssoConfig, setSsoConfig] = useState({
    enabled: true,
    clientId: '782934-google-client-id-sample.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-sample-secret-key',
    redirectUri: 'https://silab.fti.uksw.edu/auth/google/callback',
    domain: 'student.uksw.edu',
  });

  // Fetch System Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [resMaint, resAnnounce] = await Promise.all([
          api('/api/settings/maintenance'),
          api('/api/settings/announcement')
        ]);

        if (resMaint.ok) setMaintenanceMode((await resMaint.json()).enabled);
        if (resAnnounce.ok) {
           const data = await resAnnounce.json();
           setAnnouncement(data);
        }
      } catch (e) {}
    };
    fetchSettings();
  }, []);

  // Fetch Error Log when tab is active
  useEffect(() => {
    if (activeTab === 'error-log') {
        const fetchLog = async () => {
            try {
                const res = await api('/api/settings/error-log');
                if (res.ok) {
                    const data = await res.json();
                    setErrorLog(data.log);
                }
            } catch (e) { console.error(e); }
        };
        fetchLog();
    }
  }, [activeTab]);

  const handleDbSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Kirim data konfigurasi ke backend API untuk disimpan
    // await api('/api/settings/db', { method: 'POST', data: dbConfig });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    showToast('Konfigurasi Database berhasil disimpan! (Simulasi)', 'success');
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    
    // TODO: Panggil API backend untuk tes koneksi DB yang sebenarnya
    // Browser tidak bisa langsung connect ke PostgreSQL (TCP/IP)
    // const res = await api('/api/test-db', { method: 'POST', data: dbConfig });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    showToast('Koneksi Database Berhasil! (Simulasi)', 'success');
  };

  const handleSsoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Kirim konfigurasi SSO ke backend
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    showToast('Pengaturan Google SSO berhasil diperbarui! (Simulasi)', 'success');
  };

  const handleMaintenanceToggle = async () => {
    const newState = !maintenanceMode;
    setMaintenanceMode(newState); // Optimistic update
    try {
      await api('/api/settings/maintenance', {
        method: 'POST',
        data: { enabled: newState }
      });
      showToast(`Maintenance Mode ${newState ? 'Diaktifkan' : 'Dinonaktifkan'}`, newState ? 'warning' : 'success');
    } catch (e) {
      setMaintenanceMode(!newState); // Revert on error
      showToast("Gagal mengubah pengaturan", "error");
    }
  };

  const handleAnnouncementSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/settings/announcement', {
        method: 'POST',
        data: announcement
      });
      showToast('Pengumuman berhasil diperbarui', 'success');
    } catch (err) {
      showToast('Gagal menyimpan pengumuman', 'error');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      showToast('Memproses backup database...', 'info');
      
      const response = await api('/api/settings/backup');

      if (!response.ok) throw new Error('Backup failed');

      // Convert response ke Blob dan trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-corefti-${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('Backup berhasil didownload!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal mengunduh backup. Pastikan server memiliki pg_dump.', 'error');
    }
  };

  const handleRestoreDatabase = async () => {
    if (!restoreFile) return;

    if (!window.confirm("PERINGATAN: Tindakan ini akan MENIMPA seluruh data database saat ini dengan data dari file backup. Data yang ada sekarang akan HILANG. Apakah Anda yakin ingin melanjutkan?")) {
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('backupFile', restoreFile);

      const response = await api('/api/settings/restore', {
        method: 'POST',
        data: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast('Database berhasil direstore!', 'success');
        setRestoreFile(null);
      } else {
        throw new Error(result.error || 'Restore failed');
      }
    } catch (error) {
      showToast('Gagal merestore database.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan Sistem</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Konfigurasi koneksi database dan integrasi pihak ketiga</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center ${
            activeTab === 'database'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Database className="w-4 h-4 mr-2" />
          Database (PostgreSQL)
        </button>
        <button
          onClick={() => setActiveTab('sso')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center ${
            activeTab === 'sso'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Globe className="w-4 h-4 mr-2" />
          Google SSO
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center ${
            activeTab === 'system'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <ShieldAlert className="w-4 h-4 mr-2" />
          Sistem
        </button>
        <button
          onClick={() => setActiveTab('error-log')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center ${
            activeTab === 'error-log'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileWarning className="w-4 h-4 mr-2" />
          Log Error
        </button>
      </div>

      {activeTab === 'database' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
             <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                   <Server className="w-5 h-5 mr-2 text-blue-500" /> Koneksi Database
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Atur parameter koneksi ke server PostgreSQL.</p>
             </div>
             <div className="flex items-center text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
                <CheckCircle className="w-3 h-3 mr-1" /> Terhubung
             </div>
          </div>
          
          <form onSubmit={handleDbSave} className="p-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hostname / IP</label>
                   <input 
                      type="text" required
                      value={dbConfig.host}
                      onChange={e => setDbConfig({...dbConfig, host: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="127.0.0.1"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                   <input 
                      type="text" required
                      value={dbConfig.port}
                      onChange={e => setDbConfig({...dbConfig, port: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="5432"
                   />
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Database</label>
                   <input 
                      type="text" required
                      value={dbConfig.database}
                      onChange={e => setDbConfig({...dbConfig, database: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="nama_database"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                   <input 
                      type="text" required
                      value={dbConfig.username}
                      onChange={e => setDbConfig({...dbConfig, username: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="postgres"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                   <div className="relative">
                      <input 
                          type={showPassword ? "text" : "password"}
                          value={dbConfig.password}
                          onChange={e => setDbConfig({...dbConfig, password: e.target.value})}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 font-mono pr-10"
                          placeholder="******"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                         {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                   </div>
                </div>
             </div>

             <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                >
                   {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                   Tes Koneksi
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-md flex items-center"
                >
                   <Save className="w-4 h-4 mr-2" /> Simpan Pengaturan
                </button>
             </div>
          </form>
        </div>
      )}

      {activeTab === 'sso' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
           <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
             <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                   <Globe className="w-5 h-5 mr-2 text-blue-500" /> Google SSO
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Konfigurasi login menggunakan akun Google Workspace.</p>
             </div>
             <div className="flex items-center">
                 <span className={`text-sm font-medium mr-3 ${ssoConfig.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    {ssoConfig.enabled ? 'Aktif' : 'Non-Aktif'}
                 </span>
                 <button 
                    onClick={() => setSsoConfig({...ssoConfig, enabled: !ssoConfig.enabled})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${ssoConfig.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                 >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ssoConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                 </button>
             </div>
          </div>

          <form onSubmit={handleSsoSave} className="p-6 space-y-6">
             <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start">
                 <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
                 <div>
                    <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-300">Penting</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                       Pastikan URI Redirect di bawah ini telah didaftarkan di Google Cloud Console pada project credentials Anda.
                    </p>
                 </div>
             </div>

             <div className={`space-y-6 transition-opacity duration-300 ${ssoConfig.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Client ID</label>
                   <input 
                      type="text" required={ssoConfig.enabled}
                      value={ssoConfig.clientId}
                      onChange={e => setSsoConfig({...ssoConfig, clientId: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Client Secret</label>
                   <div className="relative">
                      <input 
                          type={showClientSecret ? "text" : "password"}
                          required={ssoConfig.enabled}
                          value={ssoConfig.clientSecret}
                          onChange={e => setSsoConfig({...ssoConfig, clientSecret: e.target.value})}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 font-mono pr-10"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowClientSecret(!showClientSecret)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                         {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Authorized Redirect URI</label>
                   <input 
                      type="text"
                      value={ssoConfig.redirectUri}
                      readOnly
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-500 dark:text-gray-300 font-mono cursor-not-allowed"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Restricted Domain (Opsional)</label>
                   <input 
                      type="text" 
                      value={ssoConfig.domain}
                      onChange={e => setSsoConfig({...ssoConfig, domain: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., student.uksw.edu"
                   />
                   <p className="text-xs text-gray-500 mt-1">Kosongkan untuk mengizinkan semua akun Google.</p>
                </div>
             </div>

             <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-md flex items-center"
                >
                   {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                   Simpan Konfigurasi
                </button>
             </div>
          </form>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
           <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                 <ShieldAlert className="w-5 h-5 mr-2 text-blue-500" /> Kontrol Sistem
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pengaturan darurat dan mode pemeliharaan.</p>
           </div>
           
           <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                 <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                       <Power className="w-4 h-4 mr-2 text-orange-500" /> Maintenance Mode
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                       Jika aktif, akses untuk User (Mahasiswa/Dosen) akan ditutup sementara. Admin dan Laboran tetap dapat mengakses sistem.
                    </p>
                 </div>
                 <button 
                    onClick={handleMaintenanceToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${maintenanceMode ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                 >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                 </button>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                 <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                           <Megaphone className="w-4 h-4 mr-2 text-blue-500" /> Pengumuman Global (Banner)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                           Tampilkan pesan penting di dashboard semua pengguna.
                        </p>
                    </div>
                    <div className="flex items-center">
                        <span className={`text-xs font-medium mr-2 ${announcement.active ? 'text-green-600' : 'text-gray-400'}`}>{announcement.active ? 'Aktif' : 'Non-Aktif'}</span>
                        <button 
                            onClick={() => setAnnouncement({...announcement, active: !announcement.active})}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${announcement.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${announcement.active ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
                 </div>
                 
                 <form onSubmit={handleAnnouncementSave} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Isi Pesan</label>
                        <textarea 
                            value={announcement.message}
                            onChange={e => setAnnouncement({...announcement, message: e.target.value})}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="Contoh: Lab tutup hari Jumat untuk pembersihan."
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <select 
                            value={announcement.type}
                            onChange={e => setAnnouncement({...announcement, type: e.target.value})}
                            className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                            <option value="info">Info (Biru)</option>
                            <option value="warning">Peringatan (Kuning)</option>
                            <option value="error">Kritikal (Merah)</option>
                        </select>
                        <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Simpan</button>
                    </div>
                 </form>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                 <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                           <Database className="w-4 h-4 mr-2 text-blue-500" /> Backup Database
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                           Unduh salinan lengkap database (SQL Dump) untuk keperluan arsip.
                        </p>
                    </div>
                    <button 
                        onClick={handleDownloadBackup}
                        className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2" /> Download .sql
                    </button>
                 </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                 <div className="flex flex-col space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center">
                           <Upload className="w-4 h-4 mr-2" /> Restore Database
                        </h4>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                           Pulihkan database dari file backup (.sql). <span className="font-bold">PERINGATAN: Data saat ini akan ditimpa.</span>
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <input 
                            type="file" 
                            accept=".sql"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                        >
                            <FileText className="w-4 h-4 mr-2" /> 
                            {restoreFile ? restoreFile.name : 'Pilih File .sql'}
                        </button>
                        
                        {restoreFile && (
                            <button 
                                onClick={handleRestoreDatabase}
                                disabled={isLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center shadow-sm disabled:opacity-50"
                            >
                                {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Mulai Restore
                            </button>
                        )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'error-log' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
           <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                 <FileWarning className="w-5 h-5 mr-2 text-red-500" /> System Error Log
              </h3>
              <button 
                  onClick={() => { setActiveTab('database'); setTimeout(() => setActiveTab('error-log'), 50); }} 
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Refresh Log"
              >
                  <RefreshCw className="w-4 h-4" />
              </button>
           </div>
           <div className="p-6 bg-gray-900 text-gray-300 font-mono text-xs overflow-auto max-h-[500px] whitespace-pre-wrap">
              {errorLog || "Tidak ada log untuk ditampilkan."}
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;