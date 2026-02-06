import React, { useState, useEffect } from 'react';
import { MOCK_BOOKINGS, MOCK_ROOMS } from '../services/mockData';
import { Booking, BookingStatus } from '../types';
import { Search, Filter, CheckCircle, XCircle, Calendar, Clock, MapPin, User, AlertCircle, FileText, Download, X, Phone, Shield, Loader2 } from 'lucide-react';

interface ManageBookingsProps {
  addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const ManageBookings: React.FC<ManageBookingsProps> = ({ addNotification, showToast }) => {
  // Menggunakan state yang disinkronkan dengan MOCK_BOOKINGS untuk persistensi sederhana
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | BookingStatus>('All');
  
  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Loading State untuk aksi
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Pastikan data termutakhir saat komponen dimount
  useEffect(() => {
    setBookings(MOCK_BOOKINGS);
  }, []);

  const getRoomName = (roomId: string) => {
    return MOCK_ROOMS.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const handleUpdateStatus = (id: string, newStatus: BookingStatus) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    // Set loading state
    setProcessingId(id);

    // Simulasi proses API
    setTimeout(() => {
      // 1. Update Mock Data (Persistensi In-Memory)
      const mockIndex = MOCK_BOOKINGS.findIndex(b => b.id === id);
      if (mockIndex !== -1) {
          MOCK_BOOKINGS[mockIndex].status = newStatus;
      }

      // 2. Update Local State
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      
      // 3. Update Modal State jika sedang terbuka
      if (selectedBooking && selectedBooking.id === id) {
          setSelectedBooking({ ...selectedBooking, status: newStatus });
      }

      const message = newStatus === BookingStatus.APPROVED 
        ? `Peminjaman ${booking.userName} berhasil disetujui.`
        : `Peminjaman ${booking.userName} telah ditolak.`;
      
      const type = newStatus === BookingStatus.APPROVED ? 'success' : 'warning';

      showToast(message, type);
      addNotification(
        newStatus === BookingStatus.APPROVED ? 'Peminjaman Disetujui' : 'Peminjaman Ditolak',
        `Admin telah memverifikasi request dari ${booking.userName}.`,
        type
      );

      // Reset loading state
      setProcessingId(null);
    }, 800); 
  };

  const handleViewFile = (e: React.MouseEvent, fileName: string) => {
      e.stopPropagation(); // Mencegah row click event
      const dummyPdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
      window.open(dummyPdfUrl, '_blank');
      showToast(`Membuka dokumen: ${fileName}`, 'info');
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = bookings.filter(b => b.status === BookingStatus.PENDING).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verifikasi Pesanan</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola persetujuan peminjaman ruangan</p>
        </div>
        {pendingCount > 0 && (
           <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium animate-pulse">
              <AlertCircle className="w-4 h-4 mr-2" />
              {pendingCount} Permintaan Menunggu Konfirmasi
           </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama peminjam atau keperluan..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-gray-400" />
                <select 
                   value={filterStatus}
                   onChange={(e) => setFilterStatus(e.target.value as any)}
                   className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                   <option value="All">Semua Status</option>
                   <option value={BookingStatus.PENDING}>Pending</option>
                   <option value={BookingStatus.APPROVED}>Disetujui</option>
                   <option value={BookingStatus.REJECTED}>Ditolak</option>
                </select>
            </div>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Peminjam</th>
                <th className="px-6 py-4">Ruangan & Waktu</th>
                <th className="px-6 py-4">Keperluan</th>
                <th className="px-6 py-4">Dokumen</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBookings.length > 0 ? filteredBookings.map((booking) => (
                <tr 
                  key={booking.id} 
                  onClick={() => setSelectedBooking(booking)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                  title="Klik untuk melihat detail dan verifikasi"
                >
                   <td className="px-6 py-4">
                      <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-xs">
                            {booking.userName.charAt(0)}
                         </div>
                         <div>
                            <div className="font-medium text-gray-900 dark:text-white flex items-center group-hover:text-blue-600 transition-colors">
                               {booking.userName}
                            </div>
                            <div className="text-xs text-gray-500">{booking.userId}</div>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white mb-1 flex items-center">
                         <MapPin className="w-3 h-3 mr-1 text-gray-400" /> {getRoomName(booking.roomId)}
                      </div>
                      <div className="flex flex-col space-y-0.5 text-xs text-gray-500">
                         <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {booking.date}</span>
                         <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {booking.startTime} - {booking.endTime}</span>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                      {booking.proposalFile ? (
                          <button 
                            onClick={(e) => handleViewFile(e, booking.proposalFile!)}
                            className="flex items-center text-blue-600 hover:text-blue-800 hover:underline text-xs"
                          >
                             <FileText className="w-3 h-3 mr-1" /> Lihat Surat
                          </button>
                      ) : (
                          <span className="text-gray-400 text-xs italic">-</span>
                      )}
                   </td>
                   <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium 
                        ${booking.status === BookingStatus.APPROVED ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                          booking.status === BookingStatus.REJECTED ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {booking.status}
                      </span>
                   </td>
                </tr>
              )) : (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                       Tidak ada data booking yang sesuai filter.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
               <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                     <FileText className="w-5 h-5 mr-2 text-blue-600" />
                     Detail Peminjaman
                  </h3>
                  <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Kolom Kiri: Info Peminjam */}
                      <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-gray-500 uppercase border-b pb-2 mb-3">Informasi Peminjam</h4>
                          <div className="flex items-start">
                             <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                             <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBooking.userName}</p>
                                <p className="text-xs text-gray-500">{selectedBooking.userId}</p>
                             </div>
                          </div>
                          <div className="flex items-start">
                             <Shield className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                             <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Penanggung Jawab</p>
                                <p className="text-xs text-gray-500">{selectedBooking.responsiblePerson}</p>
                             </div>
                          </div>
                          <div className="flex items-start">
                             <Phone className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                             <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Kontak / WA</p>
                                <p className="text-xs text-gray-500">{selectedBooking.contactPerson}</p>
                             </div>
                          </div>
                      </div>

                      {/* Kolom Kanan: Info Peminjaman */}
                      <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-gray-500 uppercase border-b pb-2 mb-3">Detail Kegiatan</h4>
                          <div className="flex items-start">
                             <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                             <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{getRoomName(selectedBooking.roomId)}</p>
                             </div>
                          </div>
                          <div className="flex items-start">
                             <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                             <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBooking.date}</p>
                             </div>
                          </div>
                          <div className="flex items-start">
                             <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                             <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBooking.startTime} - {selectedBooking.endTime}</p>
                             </div>
                          </div>
                          <div>
                              <p className="text-xs text-gray-500 mb-1">Keperluan:</p>
                              <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-100 dark:border-gray-600">
                                  {selectedBooking.purpose}
                              </p>
                          </div>
                      </div>
                  </div>

                  {/* Dokumen Section */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                      <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">
                              <FileText className="w-6 h-6" />
                          </div>
                          <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">Surat Permohonan.pdf</p>
                              <p className="text-xs text-gray-500">
                                  {selectedBooking.proposalFile ? selectedBooking.proposalFile : 'Tidak ada file diunggah'}
                              </p>
                          </div>
                      </div>
                      {selectedBooking.proposalFile && (
                          <button 
                             onClick={(e) => handleViewFile(e, selectedBooking.proposalFile!)}
                             className="px-3 py-1.5 bg-white dark:bg-gray-800 text-blue-600 text-xs font-bold rounded border border-blue-200 dark:border-blue-700 shadow-sm hover:bg-gray-50 flex items-center"
                          >
                              <Download className="w-3 h-3 mr-1.5" /> Buka File
                          </button>
                      )}
                  </div>
               </div>

               {/* Footer Actions */}
               <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-700/50">
                  <button 
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                  >
                     Tutup
                  </button>
                  
                  {selectedBooking.status === BookingStatus.PENDING && (
                    <>
                       <button 
                          onClick={() => handleUpdateStatus(selectedBooking.id, BookingStatus.REJECTED)}
                          disabled={processingId === selectedBooking.id}
                          className="px-4 py-2 text-sm bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg flex items-center shadow-sm transition-colors disabled:opacity-50"
                       >
                          {processingId === selectedBooking.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />} 
                          Tolak
                       </button>
                       <button 
                          onClick={() => handleUpdateStatus(selectedBooking.id, BookingStatus.APPROVED)}
                          disabled={processingId === selectedBooking.id}
                          className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center shadow-md transition-colors disabled:opacity-50"
                       >
                          {processingId === selectedBooking.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />} 
                          Setujui Peminjaman
                       </button>
                    </>
                  )}
                  
                  {selectedBooking.status !== BookingStatus.PENDING && (
                      <span className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center 
                          ${selectedBooking.status === BookingStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          Status: {selectedBooking.status}
                      </span>
                  )}
               </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ManageBookings;