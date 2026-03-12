import React, { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  User,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  Sun,
  Check,
  RefreshCw,
} from "lucide-react";
import { Role } from "../types";
import fti from "../src/assets/Gedung.jpg";
import nocLogo from "../src/assets/NOC.svg";
import { api } from "../services/api";
import { CLIENT_ID } from "../src/config/google";

declare global {
  interface Window {
    google: any;
  }
}

interface LoginProps {
  onLogin: (role: Role, userName?: string) => void;
  showToast: (
    message: string | React.ReactNode,
    type: "success" | "error" | "info" | "warning",
    sticky?: boolean,
  ) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

type ViewState = "login" | "register" | "forgot-password" | "set-password";

const Login: React.FC<LoginProps> = ({
  onLogin,
  showToast,
  isDarkMode,
  toggleDarkMode,
}) => {
  const [view, setView] = useState<ViewState>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    username: "", // New Field for Register
    password: "",
    confirmPassword: "",
    fullName: "",
    nim: "",
  });

  // CAPTCHA State
  const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
  const [captchaInput, setCaptchaInput] = useState("");

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    setCaptcha({ num1, num2, answer: num1 + num2 });
    setCaptchaInput("");
  };

  useEffect(() => {
    if (view === "forgot-password") {
      generateCaptcha();
    }
  }, [view]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Fetch SSO config on mount
  useEffect(() => {
    const fetchSsoConfig = async () => {
      try {
        const res = await api("/api/settings/sso-config");
        if (res.ok) {
          const data = await res.json();
          setSsoEnabled(data.enabled ?? true);
        }
      } catch (err) {
        console.error("Failed to fetch SSO config:", err);
      }
    };
    fetchSsoConfig();
  }, []);

  // Load Google Script
  useEffect(() => {
    if (ssoEnabled && typeof window.google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [ssoEnabled]);

  // Function to get Device ID
  const getDeviceId = () => {
    return localStorage.getItem("deviceId") || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { label: "", color: "" };
    if (password.length < 8)
      return { label: "Terlalu Pendek", color: "text-red-500" };

    let score = 0;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: "Weak", color: "text-red-500" };
    if (score === 3) return { label: "Medium", color: "text-yellow-500" };
    return { label: "Strong", color: "text-green-500" };
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Password boleh kosong jika dalam mode reset (admin reset password jadi NULL)
    if (!formData.email) {
      showToast("Mohon isi email.", "error");
      return;
    }

    setIsLoading(true);

    try {
      // Get stored deviceId or generate new one
      let deviceId = getDeviceId();
      if (!localStorage.getItem("deviceId")) localStorage.setItem("deviceId", deviceId);

      // Menggunakan wrapper 'api' (Header & URL otomatis dihandle)
      const response = await api("/api/login", {
        method: "POST",
        data: {
          email: formData.email,
          password: formData.password || "", // Kirim string kosong jika user tidak isi password
          rememberMe: rememberMe,
          deviceId: deviceId,
        },
      });

      const data = await response.json();

      // Cek apakah user harus reset password (dari Admin)
      if (data.resetRequired) {
        showToast(
          `Halo ${data.name}, Admin telah mereset akun Anda. Silakan buat password baru.`,
          "info",
        );
        // Simpan email dari response agar sesuai dengan yang ada di database
        setFormData((prev) => ({ ...prev, email: data.email }));
        setView("set-password");
        return;
      }

      if (response.ok && data.success) {
        // Simpan User ID dan Nama untuk keperluan Profile
        localStorage.setItem("authToken", data.token); // Simpan token
        localStorage.setItem("userId", data.id);
        localStorage.setItem("userName", data.name);

        // Store device ID from response
        if (data.deviceId) {
          localStorage.setItem("deviceId", data.deviceId);
        }

        // Handle "Remember Me" - Store refresh token if provided
        if (rememberMe && data.isRememberMe) {
          localStorage.setItem("rememberedEmail", formData.email);
          // In production, consider encrypting this
          if (data.refreshToken) {
            sessionStorage.setItem("refreshToken", data.refreshToken);
          }
        } else {
          localStorage.removeItem("rememberedEmail");
          sessionStorage.removeItem("refreshToken");
        }

        if (data.profileIncomplete) {
          showToast(
            `Halo ${data.name}, yuk lengkapi data profil Anda (No. HP & Prodi) agar memudahkan administrasi.`,
            "info",
          );
        }

        onLogin(data.role as Role, data.name);
      } else {
        showToast(data.error || "Login gagal.", "error");
      }
    } catch (error) {
      console.error("Login Error:", error);
      showToast("Gagal terhubung ke server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi kekuatan password
    if (formData.password.length < 8) {
      showToast("Password harus minimal 8 karakter.", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Password dan konfirmasi password tidak cocok!", "error");
      return;
    }

    if (/\s/.test(formData.username)) {
      showToast("Username tidak boleh mengandung spasi.", "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api("/api/register", {
        method: "POST",
        data: {
          fullName: formData.fullName,
          nim: formData.nim,
          email: formData.email,
          username: formData.username,
          password: formData.password,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(
          "Akun berhasil dibuat! Menunggu persetujuan Admin.",
          "success",
        );
        setView("login");
        setFormData({ ...formData, password: "", confirmPassword: "" });
      } else {
        showToast(data.error || "Registrasi gagal.", "error");
      }
    } catch (error) {
      console.error("Register Error:", error);
      showToast("Gagal terhubung ke server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseInt(captchaInput) !== captcha.answer) {
      showToast("Verifikasi keamanan salah. Silakan coba lagi.", "error");
      generateCaptcha();
      return;
    }

    if (!formData.email) {
      showToast("Mohon masukkan alamat email anda.", "warning");
      return;
    }

    if (!formData.email.includes("@")) {
      showToast("Mohon masukkan alamat email yang valid.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api("/api/check-user-exists", {
        method: "POST",
        data: { identifier: formData.email },
      });
      const data = await response.json();

      if (data.exists) {
        // Tampilkan pesan instruksi hubungi admin jika user ditemukan
        showToast(
          <span>
            Halo <b>{data.name}</b>. Silakan hubungi Admin (
            <a
              href="mailto:fti.laboran@adm.uksw.edu"
              className="underline font-bold hover:text-blue-600 dark:hover:text-blue-400"
            >
              fti.laboran@adm.uksw.edu
            </a>
            ) untuk reset password.
          </span>,
          "info",
          true,
        );
        setView("login");
      } else {
        showToast("Email atau Username tidak terdaftar dalam sistem.", "error");
      }
    } catch (error) {
      showToast("Gagal memverifikasi data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi kekuatan password
    if (formData.password.length < 8) {
      showToast("Password harus minimal 8 karakter.", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Password dan konfirmasi tidak cocok!", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api("/api/set-password", {
        method: "POST",
        data: {
          email: formData.email,
          newPassword: formData.password,
        },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message, "success");
        setView("login");
        setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      } else {
        showToast(data.error || "Gagal mengatur password.", "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!window.google) {
      showToast("Google Services belum siap. Coba refresh halaman.", "warning");
      return;
    }

    setIsGoogleLoading(true);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      callback: async (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          try {
            // Send Access Token to Backend
            const deviceId = getDeviceId();
            if (!localStorage.getItem("deviceId")) localStorage.setItem("deviceId", deviceId);

            const res = await api('/api/auth/google', {
              method: 'POST',
              data: { 
                accessToken: tokenResponse.access_token,
                deviceId: deviceId
              }
            });

            const data = await res.json();

            if (res.ok && data.success) {
               localStorage.setItem("authToken", data.token);
               localStorage.setItem("userId", data.id);
               localStorage.setItem("userName", data.name);
               if (!localStorage.getItem("deviceId")) localStorage.setItem("deviceId", deviceId);
               
               showToast(`Login berhasil sebagai ${data.name}`, "success");
               // Pass both role and userName to handleLogin to fix race condition
               onLogin(data.role as Role, data.name);
            } else {
               // Show more detailed error message if available
               const errorMessage = data.details ? `${data.error} - ${data.details}` : data.error;
               showToast(errorMessage || "Gagal login dengan Google.", "error");
               console.error("Google SSO Error:", data);
            }
          } catch (err) {
            console.error("Google Backend Error:", err);
            showToast("Gagal memproses login Google di server.", "error");
          }
        }
        setIsGoogleLoading(false);
      },
    });

    client.requestAccessToken();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row font-sans relative">
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/20 hover:bg-white/30 text-gray-800 dark:text-white lg:text-white backdrop-blur-sm lg:bg-black/20"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? (
          <Sun className="w-6 h-6" />
        ) : (
          <Moon className="w-6 h-6" />
        )}
      </button>

      {/* Left Side - Branding & Image */}
      <div className="lg:w-1/2 bg-blue-700 dark:bg-blue-900 relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 text-white">
        {/* Animated Background */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay scale-110 animate-bg-pan"
          style={{ backgroundImage: `url(${fti})` }}
        ></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <img
              src={nocLogo}
              alt="NOC Logo"
              className="w-16 h-16 object-contain"
            />

            <span className="text-2xl font-bold tracking-wide">CORE.FTI</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Campus
            <br />
            Operational Resource
            <br />
            Environment
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Fakultas Teknologi Informasi
            <br /> Universitas Kristen Satya Wacana
          </p>
        </div>
        <div className="relative z-10 text-sm text-blue-200">
          &copy; {new Date().getFullYear()} FTI UKSW. All rights reserved.
        </div>
      </div>

      {/* Right Side - Forms */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors">
        <div className="w-full max-w-md">
          {view === "login" && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  Selamat Datang
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Masuk untuk mengakses layanan laboratorium
                </p>
              </div>

              <form onSubmit={handleManualLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email / Username
                  </label>
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
                      placeholder="Email atau Username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      // required -> Dihapus agar user bisa submit kosong saat mode reset
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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
                    >
                      Ingat Saya
                    </label>
                  </div>

                  <div className="text-sm">
                    <button
                      type="button"
                      onClick={() => setView("forgot-password")}
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Lupa Password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Masuk"
                  )}
                </button>
              </form>

              <div className="mt-6">
                {ssoEnabled && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                          atau lanjutkan dengan
                        </span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-70"
                      >
                        <svg
                          className="h-5 w-5 mr-3"
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        {isGoogleLoading ? 'Menghubungkan...' : 'Google Workspace'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
                Belum punya akun?{" "}
                <button
                  onClick={() => setView("register")}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Buat akun baru
                </button>
              </p>
            </div>
          )}

          {view === "register" && (
            <div className="animate-fade-in-up">
              <button
                onClick={() => setView("login")}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
              </button>

              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  Buat Akun
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Daftar untuk mengakses sistem
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="fullName"
                      type="text"
                      required
                      onChange={handleChange}
                      className="block w-full pl-10 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    NIM / NIDN
                  </label>
                  <input
                    name="nim"
                    type="text"
                    required
                    onChange={handleChange}
                    className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="682026xxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    onChange={handleChange}
                    className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="nim@student.uksw.edu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    name="username"
                    type="text"
                    required
                    onChange={handleChange}
                    className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Username unik"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        onChange={handleChange}
                        className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="mt-1 text-xs text-right">
                        Strength:{" "}
                        <span
                          className={`font-bold ${getPasswordStrength(formData.password).color}`}
                        >
                          {getPasswordStrength(formData.password).label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Konfirmasi
                    </label>
                    <div className="relative">
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        onChange={handleChange}
                        className={`block w-full px-3 py-2.5 border ${formData.confirmPassword && formData.password !== formData.confirmPassword ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"} rounded-lg dark:bg-gray-700 dark:text-white sm:text-sm pr-10`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {formData.confirmPassword &&
                      formData.password !== formData.confirmPassword && (
                        <p className="mt-1 text-xs text-red-500">
                          Password tidak cocok
                        </p>
                      )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isLoading || formData.password !== formData.confirmPassword
                  }
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed mt-4 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Daftar Sekarang"
                  )}
                </button>
              </form>
            </div>
          )}

          {view === "forgot-password" && (
            <div className="animate-fade-in-up">
              <button
                onClick={() => setView("login")}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Login
              </button>

              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  Lupa Password?
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Masukkan email anda untuk mereset password
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="email"
                      type="text"
                      required
                      onChange={handleChange}
                      className="block w-full pl-10 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="nama@uksw.edu"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Verifikasi Keamanan
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 font-mono text-lg font-bold tracking-widest select-none text-gray-800 dark:text-gray-200">
                      {captcha.num1} + {captcha.num2} = ?
                    </div>
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="Refresh CAPTCHA"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    className="mt-2 block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="Hasil penjumlahan"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Cek Akun"
                  )}
                </button>
              </form>
            </div>
          )}

          {view === "set-password" && (
            <div className="animate-fade-in-up">
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  Buat Password Baru
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Akun:{" "}
                  <span className="font-bold text-blue-600">
                    {formData.email}
                  </span>
                </p>
              </div>

              <form onSubmit={handleSetNewPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="password"
                      type="password"
                      required
                      onChange={handleChange}
                      className="block w-full pl-10 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="••••••••"
                    />
                    {formData.password && (
                      <div className="mt-1 text-xs text-right">
                        Strength:{" "}
                        <span
                          className={`font-bold ${getPasswordStrength(formData.password).color}`}
                        >
                          {getPasswordStrength(formData.password).label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Check className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      onChange={handleChange}
                      className="block w-full pl-10 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Simpan Password & Login"
                  )}
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
