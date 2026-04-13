import React, { useMemo, useState, useEffect } from 'react';
import { Role, BookingStatus, Booking, Loan, Room, AppUser, Equipment } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  Users, Calendar, AlertCircle, CheckCircle, Clock, 
  TrendingUp, Activity, ArrowRight, Package, FileText, 
  Shield, AlertTriangle, ChevronRight, Box, XCircle, Megaphone, Info
} from 'lucide-react';
import { api } from '../services/api';
import { Skeleton } from '../components/Skeleton';
import { formatDateID } from '../src/utils/formatters';

interface DashboardProps {
  role: Role;
  onNavigate?: (page: string) => void;
}

const getColorClasses = (color: string) => {
  if (color.includes('blue')) return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' };
  if (color.includes('green')) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' };
  if (color.includes('yellow')) return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' };
  if (color.includes('red')) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' };
  if (color.includes('purple')) return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' };
  if (color.includes('orange')) return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' };
  return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; color: string; onClick?: () => void; subtext?: string }> = ({ title, value, icon: Icon, color, onClick, subtext }) => {
  const { bg, text } = getColorClasses(color);
  return (
    <div onClick={onClick} className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${onClick ? 'cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${bg}`}>
          <Icon className={`w-6 h-6 ${text}`} />
        </div>
      </div>
      {subtext && (
        <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
          {subtext}
        </div>
      )}
    </div>
  );
};

const QuickActionCard: React.FC<{ title: string; icon: React.ElementType; color: string; onClick: () => void; description: string }> = ({ title, icon: Icon, color, onClick, description }) => {
    const { bg, text } = getColorClasses(color);
    return (
        <button onClick={onClick} className="flex flex-col items-start p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group w-full text-left h-full">
            <div className={`p-3 rounded-lg ${bg} mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${text}`} />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{description}</p>
        </button>
    );
};

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-8 w-40 rounded-full" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-32">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-80">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-full opacity-50" />
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-80">
         <Skeleton className="h-6 w-32 mb-4" />
         <Skeleton className="h-48 w-48 mx-auto rounded-full opacity-50" />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ role, onNavigate }) => {
  const isUser = role.toString().toUpperCase() === Role.USER.toString().toUpperCase();
  
  // Get logged in user ID from storage (set after successful login)
  const LOGGED_IN_USER_ID = sessionStorage.getItem('userId') || localStorage.getItem('userId') || '';

  // Data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState({
    activeLoans: 0,
    totalUsers: 0,
    equipment: { total: 0, damaged: 0, good: 0, minor: 0, major: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (isUser) {
          // OPTIMASI: User biasa hanya butuh data pemesanan
          const [resBookings] = await Promise.all([
            api('/api/bookings?exclude_file=true')
          ]);
          if (resBookings.ok) setBookings(await resBookings.json());
        } else {
          // Admin dan Laboran butuh semua data statistik
          const [resBookings, resRooms, resSummary] = await Promise.all([
            api('/api/bookings?exclude_file=true'),
            api('/api/rooms?exclude_image=true'),
            api('/api/dashboard/summary')
          ]);
          if (resBookings.ok) setBookings(await resBookings.json());
          if (resRooms.ok) setRooms(await resRooms.json());
          if (resSummary.ok) setDashboardSummary(await resSummary.json());
        }
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isUser]);

  // Calculate Statistics Dynamically
  const stats = useMemo(() => {
    // User Specific Stats (Dihitung untuk semua role karena Admin juga bisa pinjam)
    const myBookings = bookings.filter(b => b.userId === LOGGED_IN_USER_ID);
    const myPending = myBookings.filter(b => b.status === BookingStatus.PENDING).length;
    const myApproved = myBookings.filter(b => b.status === BookingStatus.APPROVED).length;
    const myRejected = myBookings.filter(b => b.status === BookingStatus.REJECTED).length;

    // OPTIMASI: Hentikan kalkulasi berat jika role adalah User
    if (isUser) {
      return { totalBookings: 0, pendingBookings: 0, activeLoans: 0, availableRooms: 0, totalUsers: 0, damagedEquipment: 0, totalEquipment: 0, myBookings, myPending, myApproved, myRejected };
    }

    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => b.status === BookingStatus.PENDING).length;
    const activeLoans = dashboardSummary.activeLoans;
    
    // Simple availability check
    const today = new Date().toLocaleDateString('en-CA');
    const bookedRoomIds = new Set(
        bookings
            .filter(b => b.date === today && b.status === BookingStatus.APPROVED)
            .map(b => b.roomId)
    );
    const availableRooms = rooms.length - bookedRoomIds.size;
    
    const totalUsers = dashboardSummary.totalUsers;
    const damagedEquipment = dashboardSummary.equipment.damaged;
    const totalEquipment = dashboardSummary.equipment.total;

    return { totalBookings, pendingBookings, activeLoans, availableRooms, totalUsers, damagedEquipment, totalEquipment, myBookings, myPending, myApproved, myRejected };
  }, [isUser, bookings, rooms, dashboardSummary, LOGGED_IN_USER_ID]);

  // Calculate Chart Data
  const barData = useMemo(() => {
      if (isUser) return []; // OPTIMASI: User tidak render chart ini
      return rooms.map(room => ({
          name: room.name.split(' ').slice(0, 2).join(' '), // Shorten name for display
          bookings: bookings.filter(b => b.roomId === room.id).length
      }));
  }, [rooms, bookings, isUser]);

  const pieData = useMemo(() => {
      if (isUser) return []; // OPTIMASI: User tidak render chart ini
      const approved = bookings.filter(b => b.status === BookingStatus.APPROVED).length;
      const pending = bookings.filter(b => b.status === BookingStatus.PENDING).length;
      const rejected = bookings.filter(b => b.status === BookingStatus.REJECTED).length;

      return [
          { name: 'Disetujui', value: approved, color: '#22c55e' },
          { name: 'Pending', value: pending, color: '#f59e0b' },
          { name: 'Ditolak', value: rejected, color: '#ef4444' },
      ];
  }, [bookings, isUser]);

  const equipmentConditionData = useMemo(() => {
      if (isUser) return []; // OPTIMASI: User tidak render chart ini
      return [
          { name: 'Baik', value: dashboardSummary.equipment.good, color: '#22c55e' },
          { name: 'Rusak Ringan', value: dashboardSummary.equipment.minor, color: '#f59e0b' },
          { name: 'Rusak Berat', value: dashboardSummary.equipment.major, color: '#ef4444' },
      ];
  }, [dashboardSummary, isUser]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // --- RENDER FOR USER (MAHASISWA/DOSEN) ---
  if (isUser) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Saya</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Selamat datang di CORE.FTI</p>
          </div>
          <div className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Total Pengajuan" 
                value={stats.myBookings.length.toString()} 
                icon={FileText} 
                color="bg-blue-500" 
            onClick={() => onNavigate?.('pemesanan-saya')}
            />
            <StatCard 
                title="Menunggu" 
                value={stats.myPending.toString()} 
                icon={Clock} 
                color="bg-yellow-500" 
            onClick={() => onNavigate?.('pemesanan-saya')}
            />
            <StatCard 
                title="Disetujui" 
                value={stats.myApproved.toString()} 
                icon={CheckCircle} 
                color="bg-green-500" 
            onClick={() => onNavigate?.('pemesanan-saya')}
            />
             <StatCard 
                title="Ditolak" 
                value={stats.myRejected.toString()} 
                icon={XCircle} 
                color="bg-red-500" 
            onClick={() => onNavigate?.('pemesanan-saya')}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity (My Bookings) */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Riwayat Pengajuan Terakhir</h3>
                <button onClick={() => onNavigate?.('pemesanan-saya')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
                        Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {stats.myBookings.slice(0, 5).map((booking) => (
                        <div key={booking.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${booking.status === BookingStatus.PENDING ? 'bg-yellow-100 text-yellow-600' : booking.status === BookingStatus.APPROVED ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {booking.status === BookingStatus.PENDING ? <Clock className="w-5 h-5" /> : booking.status === BookingStatus.APPROVED ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{booking.purpose}</p>
                                    <p className="text-xs text-gray-500">{formatDateID(booking.date)} • {booking.startTime}</p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${booking.status === BookingStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : booking.status === BookingStatus.APPROVED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {booking.status}
                            </span>
                        </div>
                    ))}
                    {stats.myBookings.length === 0 && (
                        <div className="p-8 text-center text-gray-500">Belum ada riwayat pengajuan.</div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white px-1">Akses Cepat</h3>
                <div className="grid grid-cols-1 gap-4">
                <QuickActionCard title="Cari Ruangan" icon={Calendar} color="bg-blue-500" onClick={() => onNavigate?.('ruangan')} description="Lihat daftar ruangan dan fasilitas." />
                <QuickActionCard title="Cek Jadwal Lab" icon={Clock} color="bg-purple-500" onClick={() => onNavigate?.('jadwal-ruang')} description="Lihat ketersediaan ruangan." />
                <QuickActionCard title="Status Pemesanan" icon={FileText} color="bg-green-500" onClick={() => onNavigate?.('pemesanan-saya')} description="Pantau status pengajuan Anda." />
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- RENDER FOR ADMIN / LABORAN ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard {role}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Ringkasan aktivitas laboratorium</p>
        </div>
        <div className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
          Hari ini: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Menunggu Verifikasi" 
            value={stats.pendingBookings.toString()} 
            icon={Clock} 
            color="bg-yellow-500" 
            subtext={`${stats.totalBookings} Total Pengajuan`}
        onClick={() => onNavigate?.('pesanan-ruang')}
        />
        <StatCard 
            title="Peminjaman Barang" 
            value={stats.activeLoans.toString()} 
            icon={Package} 
            color="bg-blue-500" 
            subtext="Sedang dipinjam"
        onClick={() => onNavigate?.('peminjaman-barang')}
        />
        <StatCard 
            title="Kondisi Inventaris" 
            value={stats.damagedEquipment.toString()} 
            icon={AlertTriangle} 
            color={stats.damagedEquipment > 0 ? "bg-red-500" : "bg-green-500"} 
            subtext="Barang Rusak / Bermasalah"
        onClick={() => onNavigate?.('inventaris')}
        />
        <StatCard 
            title="Total User" 
            value={stats.totalUsers.toString()} 
            icon={Users} 
            color="bg-purple-500" 
            subtext="Mahasiswa & Dosen"
        onClick={() => onNavigate?.('manajemen-user')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Statistik Penggunaan Ruangan</h3>
          <div className="flex-1 min-h-75">
            {bookings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <Activity className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Belum ada data penggunaan ruangan</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status & Quick Actions */}
        <div className="space-y-6">
            {/* Booking Status Pie */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Status Pengajuan</h3>
              <div className="h-48 flex items-center justify-center">
                {bookings.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <p className="text-sm">Belum ada data pengajuan</p>
                  </div>
                )}
              </div>
            </div>

            {/* Equipment Condition Pie */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Kesehatan Inventaris</h3>
              <div className="h-48 flex items-center justify-center">
                {dashboardSummary.equipment.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={equipmentConditionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {equipmentConditionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <p className="text-sm">Belum ada data inventaris</p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Bottom Section: Recent & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bookings List */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pengajuan Terbaru</h3>
              <button onClick={() => onNavigate?.('pesanan-ruang')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
                      Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {bookings.length > 0 ? bookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${booking.status === BookingStatus.PENDING ? 'bg-yellow-100 text-yellow-600' : booking.status === BookingStatus.APPROVED ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                  {booking.status === BookingStatus.PENDING ? <Clock className="w-5 h-5" /> : booking.status === BookingStatus.APPROVED ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                              </div>
                              <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{booking.purpose}</p>
                                  <p className="text-xs text-gray-500">{booking.userName} • {formatDateID(booking.date)}</p>
                              </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${booking.status === BookingStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : booking.status === BookingStatus.APPROVED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {booking.status}
                          </span>
                      </div>
                  )) : (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Belum ada pengajuan terbaru.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-4 content-start">
          <QuickActionCard title="Verifikasi Jadwal" icon={CheckCircle} color="bg-green-500" onClick={() => onNavigate?.('pesanan-ruang')} description="Setujui atau tolak pengajuan ruangan." />
          <QuickActionCard title="Input Peminjaman" icon={Box} color="bg-blue-500" onClick={() => onNavigate?.('peminjaman-barang')} description="Catat peminjaman barang baru." />
          <QuickActionCard title="Tambah User" icon={Users} color="bg-purple-500" onClick={() => onNavigate?.('manajemen-user')} description="Registrasi pengguna baru." />
          <QuickActionCard title="Laporan Inventaris" icon={FileText} color="bg-orange-500" onClick={() => onNavigate?.('inventaris')} description="Cek stok dan kondisi aset." />
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
