import React, { useState, useEffect, useRef } from 'react';
import { Booking, BookingStatus, Room } from '../types';
import { Calendar, Clock, MapPin, Search, FileText, XCircle, AlertCircle, CheckCircle, Hourglass, Trash2, Download, Plus, X, Edit } from 'lucide-react';
import { api } from '../services/api';
import QRCode from "react-qr-code";
import nocLogo from "../src/assets/noc.png";
import BookingForm from '../components/BookingForm';
import ConfirmModal from '../components/ConfirmModal';
import { useRooms } from '../hooks/useRooms';
import { formatDateID } from '../src/utils/formatters';

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
          const bkRes = await api('/api/bookings?exclude_file=true');
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
    // Menyisipkan nilai properti file agar BookingForm mendeteksi keberadaan surat
    // dan tidak memaksa pengguna (mahasiswa) untuk mengunggah ulang file PDF.
    setEditingBooking({
      ...booking,
      proposalFile: (booking as any).hasFile ? booking.id : undefined
    });
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
      const res = await api(`/api/bookings/${confirmModal.targetId}`, { method: 'DELETE' });
      if (res.ok) {
        setMyBookings(prev => prev.filter(b => b.id !== confirmModal.targetId));
        showToast(confirmModal.actionType === 'cancel' ? "Permohonan dibatalkan." : "Riwayat dihapus.", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Gagal membatalkan permohonan.", "error");
      }
    } catch (e) {
      showToast("Tindakan gagal dilakukan.", "error");
    } finally {
      setIsConfirming(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleViewFile = async (bookingId: string) => {
      try {
          showToast("Sedang memuat file...", "info");
          const res = await api(`/api/bookings/${bookingId}/file`);
          if (res.ok) {
              const data = await res.json();
              const fetchRes = await fetch(data.file);
              const blob = await fetchRes.blob();
              const url = window.URL.createObjectURL(blob);
              window.open(url, '_blank');
          } else {
              showToast("File tidak ditemukan.", "error");
          }
      } catch (err) {
          showToast("Gagal membuka file.", "error");
      }
  };

  const handleDownloadProof = async (booking: Booking) => {
      setProofBooking(booking);
      showToast("Menyiapkan dokumen PDF...", "info");
      
      setTimeout(async () => {
          if (proofRef.current) {
              const printContents = proofRef.current.innerHTML;
              const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(el => el.outerHTML).join('\n');
              const printWindow = window.open('', '_blank', 'width=900,height=1000');
              if (printWindow) {
                  printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                          <title>Bukti Peminjaman - ${booking.id}</title>
                          ${styles}
                          <style>
                              @page { size: A4 portrait; margin: 0; }
                              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
                          </style>
                      </head>
                      <body class="bg-white text-black font-sans">
                          <div style="width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto; position: relative;">
                              ${printContents}
                          </div>
                          <script>
                              window.onload = function() {
                                  setTimeout(function() {
                                      window.print();
                                      window.close();
                                  }, 800); // Tunggu tailwind & font selesai dirender
                              };
                          </script>
                      </body>
                      </html>
                  `);
                  printWindow.document.close();
              }
              setProofBooking(null);
          }
      }, 800); // Beri waktu sebentar agar render React (termasuk QRCode) selesai
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
                                    Alasan: {booking.rejectionReason}
                                </span>
                            )}
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white mb-1 flex items-center">
                           <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> {getRoomName(booking.roomId)}
                        </div>
                        <div className="flex flex-col space-y-1 text-xs text-gray-500">
                           <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5"/> {formatDateID(booking.date)}</span>
                           <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5"/> {booking.startTime} - {booking.endTime}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                     {(booking as any).hasFile ? (
                           <button 
                           onClick={() => handleViewFile(booking.id)} 
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

      <div className="absolute -left-2499.75 top-0 opacity-0 invisible pointer-events-none">
        <div ref={proofRef} className="w-full text-black">
            {proofBooking && (
                <div className="relative z-10">
                    {/* Kop Surat */}
                    <div className="flex items-center border-b-4 border-double border-gray-900 pb-6 mb-8">
                        <img src={nocLogo} alt="Logo" className="w-24 h-24 object-contain mr-6" />
                        <div className="flex-1 text-center">
                            <h2 className="text-xl font-bold uppercase tracking-wider text-gray-800">Universitas Kristen Satya Wacana</h2>
                            <h1 className="text-2xl font-extrabold uppercase tracking-widest text-blue-900 mt-1">Fakultas Teknologi Informasi</h1>
                            <p className="text-sm text-gray-600 mt-2">Jl. Dr. O. Notohamidjojo No.1-10, Blotongan, Salatiga 50715</p>
                            <p className="text-sm text-gray-600">Email: fti.laboran@adm.uksw.edu | Telp: (0298) 321212</p>
                        </div>
                        <div className="w-24 h-24 flex items-center justify-center">
                            <QRCode value={proofBooking.id} size={80} level="M" />
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h3 className="text-xl font-bold text-black underline underline-offset-4 mb-2">SURAT PERSETUJUAN PEMINJAMAN FASILITAS</h3>
                        <p className="text-sm text-gray-600 font-mono">No. Reg: {proofBooking.id}</p>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-800 leading-relaxed text-justify mb-4">
                            Berdasarkan permohonan peminjaman fasilitas yang diajukan pada sistem CORE.FTI, dengan ini Laboratorium Fakultas Teknologi Informasi UKSW menerangkan bahwa:
                        </p>
                    </div>

                    {/* Data Peminjam */}
                    <div className="mb-8">
                        <table className="w-full text-left border-collapse">
                            <tbody>
                                <tr>
                                    <td className="py-2 w-1/3 font-semibold text-gray-700">Nama Peminjam</td>
                                    <td className="py-2 w-4 text-center">:</td>
                                    <td className="py-2 font-bold text-gray-900">{proofBooking.userName}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700">NIM / NIDN</td>
                                    <td className="py-2 text-center">:</td>
                                    <td className="py-2 text-gray-800">{proofBooking.userId}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700">Penanggung Jawab</td>
                                    <td className="py-2 text-center">:</td>
                                    <td className="py-2 text-gray-800">{proofBooking.responsiblePerson}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700">Kontak Person</td>
                                    <td className="py-2 text-center">:</td>
                                    <td className="py-2 text-gray-800">{proofBooking.contactPerson}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-800 leading-relaxed text-justify mb-4">
                            Telah <strong className="text-green-700">DISETUJUI</strong> untuk menggunakan fasilitas ruangan sebagai berikut:
                        </p>
                    </div>

                    {/* Data Kegiatan & Ruangan */}
                    <div className="mb-8">
                        <table className="w-full text-left border-collapse">
                            <tbody>
                                <tr>
                                    <td className="py-2 w-1/3 font-semibold text-gray-700">Nama Kegiatan</td>
                                    <td className="py-2 w-4 text-center">:</td>
                                    <td className="py-2 font-bold text-gray-900">{proofBooking.purpose}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700">Ruangan</td>
                                    <td className="py-2 text-center">:</td>
                                    <td className="py-2 font-bold text-blue-800">{getRoomName(proofBooking.roomId)}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-700 items-start align-top">Waktu Pelaksanaan</td>
                                    <td className="py-2 text-center align-top">:</td>
                                    <td className="py-2 text-gray-800">
                                        {(proofBooking as any).schedules && (proofBooking as any).schedules.length > 0 ? (
                                            <ul className="list-disc ml-4 space-y-1">
                                                {(proofBooking as any).schedules.map((sch: any, idx: number) => (
                                                    <li key={idx}>
                                                        <span className="font-semibold">{new Date(sch.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span> — Pukul {sch.startTime?.slice(0,5)} s.d {sch.endTime?.slice(0,5)} WIB
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <>
                                                <span className="font-bold">{new Date(proofBooking.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><br/>
                                                Pukul {proofBooking.startTime?.slice(0,5)} s.d {proofBooking.endTime?.slice(0,5)} WIB
                                            </>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-12">
                        <p className="text-gray-800 leading-relaxed text-justify">
                            Demikian surat persetujuan ini diterbitkan secara otomatis oleh sistem untuk dapat digunakan sebagaimana mestinya. Peminjam wajib menjaga kebersihan dan keamanan fasilitas yang digunakan.
                        </p>
                    </div>

                    {/* Tanda Tangan */}
                    <div className="flex justify-between items-end pt-8">
                        <div className="text-xs text-gray-400">
                            <p>Dokumen sah dicetak dari sistem CORE.FTI.</p>
                            <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="text-center w-64">
                            <p className="text-sm text-gray-800 mb-2">Salatiga, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="text-sm font-bold text-gray-800 mb-16">Admin Laboratorium</p>
                            <div className="border-b border-gray-400 w-full mb-2"></div>
                            <p className="text-xs text-gray-500">Fakultas Teknologi Informasi</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 shrink-0">
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
