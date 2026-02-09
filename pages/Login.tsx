import React, { useState } from 'react';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, Moon, Sun } from 'lucide-react';
import { Role } from '../types';
import fti from "../src/assets/fti.jpg";
import nocLogo from "../src/assets/noc.png";

interface LoginProps {
  onLogin: (role: Role) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

type ViewState = 'login' | 'register' | 'forgot-password';

const Login: React.FC<LoginProps> = ({ onLogin, showToast, isDarkMode, toggleDarkMode }) => {
  const [view, setView] = useState<ViewState>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    nim: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showToast('Mohon isi email dan password.', 'error');
      return;
    }

    setIsLoading(true);
    // Simulate Auth Check
    setTimeout(() => {
      setIsLoading(false);
      
      // Demo Logic for Role Determination based on email
      const emailLower = formData.email.toLowerCase();
      let role = Role.USER;
      
      if (emailLower.includes('admin')) {
        role = Role.ADMIN;
      } else if (emailLower.includes('laboran') || emailLower.includes('teknisi')) {
        role = Role.LABORAN;
      }

      onLogin(role);
    }, 1500);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast('Password dan konfirmasi password tidak cocok!', 'error');
      return;
    }

    setIsLoading(true);
    // Simulate Registration
    setTimeout(() => {
      setIsLoading(false);
      showToast('Akun berhasil dibuat! Silakan login.', 'success');
      setView('login');
      setFormData({ ...formData, password: '', confirmPassword: '' });
    }, 1500);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      showToast('Mohon masukkan alamat email anda.', 'warning');
      return;
    }

    setIsLoading(true);
    // Simulate Reset Link
    setTimeout(() => {
      setIsLoading(false);
      showToast(`Link reset password telah dikirim ke ${formData.email}`, 'info');
      setView('login');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row font-sans relative">
      {/* Dark Mode Toggle */}
      <button 
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/20 hover:bg-white/30 text-gray-800 dark:text-white lg:text-white backdrop-blur-sm lg:bg-black/20"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      {/* Left Side - Branding & Image */}
      <div className="lg:w-1/2 bg-blue-600 dark:bg-blue-800 relative overflow-hidden flex flex-col justify-between p-12 text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay"
      style={{ backgroundImage: `url(${fti})` }}></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
          <div className="flex items-center justify-center">
          <img
            src={nocLogo}
            alt="NOC Logo"
            className="w-16 h-16 object-contain"/>
          </div>
  
            <span className="text-2xl font-bold tracking-wide">CORE.FTI</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Sistem Informasi <br/> Laboratorium
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Fakultas Teknologi Informasi<br/> Universitas Kristen Satya Wacana
          </p>
        </div>
        <div className="relative z-10 text-sm text-blue-200">
          &copy; {new Date().getFullYear()} FTI UKSW. All rights reserved.
        </div>
      </div>

      {/* Right Side - Forms */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors">
        <div className="w-full max-w-md">
          {view === 'login' && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Selamat Datang</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Masuk untuk mengakses layanan laboratorium
                </p>
              </div>

              <form onSubmit={handleManualLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email / Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="email"
                      type="text"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="nama@uksw.edu"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                     <button type="button" onClick={() => setView('forgot-password')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Lupa Password?</button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Masuk'}
                </button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">atau lanjutkan dengan</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => onLogin(Role.USER)}
                    className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <svg className="h-5 w-5 mr-3" aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google Workspace
                  </button>
                </div>
              </div>

              <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
                Belum punya akun?{' '}
                <button onClick={() => setView('register')} className="font-medium text-blue-600 hover:text-blue-500">
                  Buat akun baru
                </button>
              </p>
            </div>
          )}

          {view === 'register' && (
            <div className="animate-fade-in-up">
              <button onClick={() => setView('login')} className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6 transition-colors">
                 <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
              </button>
              
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Buat Akun</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Daftar untuk mengakses sistem</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input name="fullName" type="text" required onChange={handleChange} className="block w-full pl-10 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" placeholder="John Doe" />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIM / NIDN</label>
                   <input name="nim" type="text" required onChange={handleChange} className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" placeholder="672019xxx" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email UKSW</label>
                   <input name="email" type="email" required onChange={handleChange} className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" placeholder="nama@student.uksw.edu" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                     <input name="password" type="password" required onChange={handleChange} className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" placeholder="••••••••" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konfirmasi</label>
                     <input name="confirmPassword" type="password" required onChange={handleChange} className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" placeholder="••••••••" />
                   </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 mt-4 transition-colors"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Daftar Sekarang'}
                </button>
              </form>
            </div>
          )}

          {view === 'forgot-password' && (
             <div className="animate-fade-in-up">
               <button onClick={() => setView('login')} className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
               </button>

               <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Lupa Password?</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Masukkan email anda untuk mereset password</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Terdaftar</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input name="email" type="email" required onChange={handleChange} className="block w-full pl-10 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm" placeholder="nama@uksw.edu" />
                   </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kirim Link Reset'}
                </button>
              </form>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;