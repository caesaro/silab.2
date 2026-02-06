import React, { useState } from 'react';
import { MOCK_BOOKINGS, MOCK_ROOMS } from '../services/mockData';
import { Booking, BookingStatus } from '../types';
import { Calendar, Clock, MapPin, Search, FileText, XCircle, AlertCircle, CheckCircle, Hourglass, Trash2 } from 'lucide-react';

interface MyBookingsProps {
  userId: string;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const MyBookings: React.FC<MyBookingsProps> = ({ userId, showToast }) => {
  // Filter bookings for this user initially
  const [myBookings, setMyBookings] = useState<Booking[]>(
    MOCK_BOOKINGS.filter(b => b.userId === userId)
  );
  const [searchTerm, setSearchTerm] = useState('');

  const getRoomName = (roomId: string) => {
    return MOCK_ROOMS.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const getStatusConfig = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.APPROVED:
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle };
      case BookingStatus.REJECTED:
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle };
      default:
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Hourglass };
    }
  };

  const handleCancelBooking = (id: string) => {
    if (confirm("Apakah Anda yakin ingin membatalkan permohonan peminjaman ini?")) {
      setMyBookings(prev => prev.filter(b => b.id !== id));
      showToast("Permohonan peminjaman berhasil dibatalkan.", "info");
    }
  };

  const filteredBookings = myBookings.filter(b => 
    b.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRoomName(b.roomId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pemesanan Saya</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Riwayat dan status peminjaman ruangan Anda</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
                <FileText className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Pengajuan</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{myBookings.length}</h3>
             </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
             <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg mr-4">
                <Hourglass className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Menunggu</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{myBookings.filter(b => b.status === BookingStatus.PENDING).length}</h3>
             </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
             <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
                <CheckCircle className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Disetujui</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{myBookings.filter(b => b.status === BookingStatus.APPROVED).length}</h3>
             </div>
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari berdasarkan kegiatan atau ruangan..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Detail Kegiatan</th>
                <th className="px-6 py-4">Ruangan & Waktu</th>
                <th className="px-6 py-4">Dokumen</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBookings.length > 0 ? filteredBookings.map((booking) => {
                const statusConfig = getStatusConfig(booking.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                     <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white text-base mb-1">{booking.purpose}</div>
                        <div className="text-xs text-gray-500 flex flex-col gap-1">
                            <span>PJ: {booking.responsiblePerson}</span>
                            <span>Kontak: {booking.contactPerson}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white mb-1 flex items-center">
                           <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> {getRoomName(booking.roomId)}
                        </div>
                        <div className="flex flex-col space-y-1 text-xs text-gray-500">
                           <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5"/> {booking.date}</span>
                           <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5"/> {booking.startTime} - {booking.endTime}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        {booking.proposalFile ? (
                           <a href="#" className="flex items-center text-blue-600 hover:underline text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded w-fit">
                              <FileText className="w-3 h-3 mr-1" /> {booking.proposalFile}
                           </a>
                        ) : (
                           <span className="text-gray-400 text-xs italic">Tidak ada file</span>
                        )}
                     </td>
                     <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                           <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                           {booking.status}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                        {booking.status === BookingStatus.PENDING ? (
                           <button 
                              onClick={() => handleCancelBooking(booking.id)}
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center ml-auto"
                           >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Batalkan
                           </button>
                        ) : (
                           <span className="text-gray-400 text-xs italic">Tidak dapat diubah</span>
                        )}
                     </td>
                  </tr>
                );
              }) : (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                       <div className="flex flex-col items-center justify-center">
                          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-3">
                             <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <p>Belum ada riwayat pemesanan.</p>
                       </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;