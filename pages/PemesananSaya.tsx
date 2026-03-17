import React, { useState, useEffect, useRef } from 'react';
import { Booking, BookingStatus, Room } from '../types';
import { Calendar, Clock, MapPin, Search, FileText, XCircle, AlertCircle, CheckCircle, Hourglass, Trash2, Download, Plus, X, Edit } from 'lucide-react';
import { api } from '../services/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import nocLogo from "../src/assets/noc.png";
import BookingForm from '../components/BookingForm';
import ConfirmModal from '../components/ConfirmModal';
import { useRooms } from '../hooks/useRooms';

interface PemesananSayaProps {
  userId: string;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const PemesananSaya: React.FC<PemesananSayaProps> = ({ userId, showToast }) => {
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const { rooms } = useRooms({ excludeImage: true });
  const [searchTerm, setSearchTerm] = useState('');
  const [proofBooking, setProofBooking] = useState<Booking | null>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', targetId: '', actionType: ''
  });
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchData = async () => {
      try {
          const bkRes = await api('/api/bookings');
          if (bkRes.ok) {
              const allBookings: Booking[] = await bkRes.json();
              setMyBookings(allBookings.filter(b => b.userId === userId));
          }
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleCreateBooking = () => {
    setEditingBooking(null);
    setIsBookingModalOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setEditingBooking(null);
  };

  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
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

  const handleCancelClick = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Batalkan Permohonan',
      message: 'Apakah Anda yakin ingin membatalkan permohonan peminjaman ini?',
      targetId: id,
      actionType: 'cancel'
    });
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Riwayat',
      message: 'Hapus riwayat peminjaman ini? Data tidak dapat dikembalikan.',
      targetId: id,
      actionType: 'delete'
    });
  };

  const executeConfirmAction = async () => {
    setIsConfirming(true);
    try {
      await api(`/api/bookings/${confirmModal.targetId}`, { method: 'DELETE' });
      setMyBookings(prev => prev.filter(b => b.id !== confirmModal.targetId));
      showToast(confirmModal.actionType === 'cancel' ? "Permohonan dibatalkan." : "Riwayat dihapus.", "success");
    } catch (e) {
      showToast("Tindakan gagal dilakukan.", "error");
    } finally {
      setIsConfirming(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleViewFile = async (fileData: string) => {
      try {
          const res = await fetch(fileData);
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
      } catch (err) {
          showToast("Gagal membuka file.", "error");
      }
  };

  const handleDownloadProof = async (booking: Booking) => {
      setProofBooking(booking);
      setTimeout(async () => {
          if (proofRef.current) {
              try {
                  showToast("Sedang membuat PDF...", "info");
                  const canvas = await html2canvas(proofRef.current, { 
                      scale: 2,
                      backgroundColor: '#ffffff',
                      useCORS: true 
                  });
                  const imgData = canvas.toDataURL('image/png');
                  
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                  
                  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                  pdf.save(`Bukti_Peminjaman_${booking.id}.pdf`);
                  showToast("Bukti peminjaman berhasil didownload", "success");
              } catch (e) {
                  console.error(e);
                  showToast("Gagal membuat PDF", "error");
              } finally {
                  setProofBooking(null);
              }
          }
      }, 500);
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
        <button onClick={handleCreateBooking} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium shadow-sm transition-all hover:scale-105">
          <Plus className="w-4 h-4 mr-2" /> Buat Pesanan Baru
        </button>
      </div>

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
                            {booking.status === BookingStatus.REJECTED && booking.rejectionReason && (
                                <span className="text-red-600 dark:text-red-400 font-medium mt-1 bg-red-50 dark:bg-red-900/20 p-1 rounded border border-red-100 dark:border-red-800">
                                    Alasan Ditolak: {booking.rejectionReason}
                                </span>
                            )}
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
                           <button 
                              onClick={() => handleViewFile(booking.proposalFile!)} 
                              className="flex items-center text-blue-600 hover:underline text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded w-fit"
                           >
                              <FileText className="w-3 h-3 mr-1" /> Lihat File
                           </button>
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
                           <div className="flex items-center justify-end space-x-2">
                             <button 
                                onClick={() => handleEditBooking(booking)}
                                className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center"
                             >
                                <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                             </button>
                             <button 
                                onClick={() => handleCancelClick(booking.id)}
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center"
                             >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Batalkan
                             </button>
                           </div>
                        ) : booking.status === BookingStatus.APPROVED ? (
                           <button 
                              onClick={() => handleDownloadProof(booking)}
                              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center ml-auto"
                           >
                              <Download className="w-3.5 h-3.5 mr-1.5" /> Download Bukti
                           </button>
                        ) : booking.status === BookingStatus.REJECTED ? (
                           <button 
                              onClick={() => handleDeleteClick(booking.id)}
                              className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center ml-auto"
                           >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus
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

      <div className="absolute -left-[9999px] top-0">
        <div ref={proofRef} className="w-[210mm] min-h-[297mm] bg-white p-12 font-sans text-gray-900 relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                <img src={nocLogo} className="w-[500px] h-[500px] object-contain" />
            </div>

            {proofBooking && (
                <div className="relative z-10">
                    <div className="flex items-center justify-between border-b-4 border-blue-900 pb-6 mb-8">
                        <div className="flex items-center gap-4">
                            <img src={nocLogo} alt="Logo" className="w-24 h-24 object-contain" />
                            <div>
                                <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wider">Fakultas Teknologi Informasi</h1>
                                <h2 className="text-xl font-semibold text-gray-700">Universitas Kristen Satya Wacana</h2>
                                <p className="text-sm text-gray-500 mt-1">Jl. Dr. O. Notohamidjojo No.1-10, Salatiga 50715</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-3xl font-bold text-gray-200">BUKTI PEMINJAMAN</h3>
                            <p className="text-sm font-mono text-gray-400 mt-1">{proofBooking.id}</p>
                        </div>
                    </div>

                    <div className="flex justify-end mb-8">
                        <div className="px-6 py-2 bg-green-100 text-green-800 border border-green-200 rounded-lg font-bold text-lg uppercase tracking-widest">
                            DISETUJUI
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4 border-b border-gray-200 pb-2">Detail Kegiatan</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Nama Kegiatan</p>
                                    <p className="text-xl font-bold text-gray-900">{proofBooking.purpose}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Peminjam</h4>
                                    <p className="text-lg font-medium">{proofBooking.userName}</p>
                                    <p className="text-sm text-gray-600">{proofBooking.userId}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Penanggung Jawab</h4>
                                    <p className="text-lg font-medium">{proofBooking.responsiblePerson}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Kontak</h4>
                                    <p className="text-lg font-medium">{proofBooking.contactPerson}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Fasilitas / Ruangan</h4>
                                    <p className="text-lg font-medium text-blue-700">{getRoomName(proofBooking.roomId)}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Waktu Pelaksanaan</h4>
                                    <p className="text-lg font-medium">{new Date(proofBooking.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    <p className="text-xl font-bold text-gray-900 mt-1">{proofBooking.startTime} - {proofBooking.endTime} WIB</p>
                                </div>
                            </div>
                        </div>

                    <div className="mt-20 pt-8 border-t border-gray-200 flex justify-between items-end">
                        <div className="text-xs text-gray-400">
                            <p>Dokumen ini dibuat secara otomatis oleh sistem CORE.FTI.</p>
                            <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
                        </div>
                        <div className="text-center">
                            <div className="h-20 w-40 mb-2"></div>
                            <p className="text-sm font-bold text-gray-700 uppercase">Admin Laboratorium</p>
                        </div>
                    </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center text-base">
                    <Plus className="w-5 h-5 mr-2 text-blue-600" />
                    {editingBooking ? 'Edit Pesanan Ruangan' : 'Buat Pesanan Ruangan'}
                 </h3>
                 <button onClick={closeBookingModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <BookingForm
                  rooms={rooms}
                  initialData={editingBooking}
                  showToast={showToast}
                  onSuccess={() => { closeBookingModal(); fetchData(); }}
                  onCancel={closeBookingModal}
                />
              </div>
           </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.actionType === 'cancel' ? 'Ya, Batalkan' : 'Ya, Hapus'}
        type={confirmModal.actionType === 'cancel' ? 'warning' : 'danger'}
        isLoading={isConfirming}
      />
    </div>
  );
};

export default PemesananSaya;
