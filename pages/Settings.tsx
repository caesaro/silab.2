import React, { useState } from 'react';
import { Database, Server, Lock, Globe, Save, RefreshCw, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsProps {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const Settings: React.FC<SettingsProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'database' | 'sso'>('database');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  // Database State
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '3306',
    database: 'silab_fti',
    username: 'root',
    password: '',
  });

  // SSO State
  const [ssoConfig, setSsoConfig] = useState({
    enabled: true,
    clientId: '782934-google-client-id-sample.apps.googleusercontent.com',
    clientSecret: 'GOCSPX-sample-secret-key',
    redirectUri: 'https://silab.fti.uksw.edu/auth/google/callback',
    domain: 'student.uksw.edu',
  });

  const handleDbSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      showToast('Konfigurasi Database berhasil disimpan!', 'success');
    }, 1500);
  };

  const handleTestConnection = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast('Koneksi Database Berhasil!', 'success');
    }, 1500);
  };

  const handleSsoSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast('Pengaturan Google SSO berhasil diperbarui!', 'success');
    }, 1500);
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
          Database (MySQL)
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
      </div>

      {activeTab === 'database' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
             <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                   <Server className="w-5 h-5 mr-2 text-blue-500" /> Koneksi Database
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Atur parameter koneksi ke server MySQL.</p>
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
                      placeholder="3306"
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
                      placeholder="root"
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
    </div>
  );
};

export default Settings;