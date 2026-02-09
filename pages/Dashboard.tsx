import React, { useMemo } from 'react';
import { Role, BookingStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { MOCK_BOOKINGS, MOCK_LOANS, MOCK_ROOMS, MOCK_USERS } from '../services/mockData';

interface DashboardProps {
  role: Role;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ role }) => {
  // Calculate Statistics Dynamically
  const stats = useMemo(() => {
    const totalBookings = MOCK_BOOKINGS.length;
    const activeLoans = MOCK_LOANS.filter(l => l.status === 'Dipinjam').length;
    
    // Simple availability check: Rooms not booked today (ignoring time for simplicity in mock)
    const today = new Date().toLocaleDateString('en-CA');
    const bookedRoomIds = new Set(
        MOCK_BOOKINGS
            .filter(b => b.date === today && b.status === BookingStatus.APPROVED)
            .map(b => b.roomId)
    );
    const availableRooms = MOCK_ROOMS.length - bookedRoomIds.size;
    
    const totalUsers = MOCK_USERS.length;

    return { totalBookings, activeLoans, availableRooms, totalUsers };
  }, []);

  // Calculate Chart Data
  const barData = useMemo(() => {
      return MOCK_ROOMS.map(room => ({
          name: room.name.split(' ').slice(0, 2).join(' '), // Shorten name for display
          bookings: MOCK_BOOKINGS.filter(b => b.roomId === room.id).length
      }));
  }, []);

  const pieData = useMemo(() => {
      const approved = MOCK_BOOKINGS.filter(b => b.status === BookingStatus.APPROVED).length;
      const pending = MOCK_BOOKINGS.filter(b => b.status === BookingStatus.PENDING).length;
      const rejected = MOCK_BOOKINGS.filter(b => b.status === BookingStatus.REJECTED).length;

      return [
          { name: 'Disetujui', value: approved, color: '#22c55e' },
          { name: 'Pending', value: pending, color: '#f59e0b' },
          { name: 'Ditolak', value: rejected, color: '#ef4444' },
      ];
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard {role}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Overview of laboratory activities</p>
        </div>
        <div className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
          Today: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Pemesanan" value={stats.totalBookings.toString()} icon={Calendar} color="bg-blue-500" />
        <StatCard title="Peminjaman Aktif" value={stats.activeLoans.toString()} icon={AlertCircle} color="bg-orange-500" />
        <StatCard title="Ruangan Tersedia" value={stats.availableRooms.toString()} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Total User" value={stats.totalUsers.toString()} icon={Users} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Statistik Penggunaan Ruangan</h3>
          <div className="h-64">
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
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Status Peminjaman</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
             {pieData.map((item, idx) => (
               <div key={idx} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                 <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                 {item.name}
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
