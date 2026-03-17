import React, { useState, useEffect, useRef } from 'react';
import { Booking, BookingStatus, Room, Role } from '../types';
import { Search, Filter, CheckCircle, XCircle, Calendar, Clock, MapPin, User, AlertCircle, FileText, Download, X, Phone, Shield, Loader2, Wrench, Edit, Save, Share2, FileSpreadsheet, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { api } from '../services/api';
import html2canvas from 'html2canvas';
import nocLogo from "../src/assets/noc.png";
import BookingForm from '../components/BookingForm';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useRooms } from '../hooks/useRooms';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface ManageBookingsProps {
  addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

interface BookingWithTech extends Booking {
  techSupportPic?: string[];
  techSupportPicName?: string;
  techSupportNeeds?: string;
}

interface LabStaff {
  id: string;
  name: string;
  jabatan: string;
  status: string;
}

const PesananRuang: React.FC<ManageBookingsProps> = ({ addNotification, showToast }) => {
  const [bookings, setBookings] = useState<BookingWithTech[]>([]);
  const { rooms } = useRooms({ excludeImage: true });
  const [staffList, setStaffList] = useState<LabStaff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | BookingStatus>('All');
  const [filterDate, setFilterDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingWithTech | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const googleApi = useGoogleCalendar(Role.ADMIN, showToast);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [bookingToApprove, setBookingToApprove] = useState<BookingWithTech | null>(null);
  const [approvalData, setApprovalData] = useState<{ pic: string[], needs: string }>({ pic: [], needs: '' });

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [bookingToReject, setBookingToReject] = useState<BookingWithTech | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [isEditingTech, setIsEditingTech] = useState(false);
  const [editTechData, setEditTechData] = useState<{ pic: string[], needs: string }>({ pic: [], needs: '' });

  const [isDeleteCalendarModalOpen, setIsDeleteCalendarModalOpen] = useState(false);
  const [bookingToDeleteCalendar, setBookingToDeleteCalendar] = useState<BookingWithTech | null>(null);
  const [deleteOption, setDeleteOption] = useState<'single' | 'thisAndFollowing' | 'all'>('single');
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Booking State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<BookingWithTech | null>(null);

  // Handle delete booking click
  const handleDeleteClick = (booking: BookingWithTech) => {
    setBookingToDelete(booking);
    setIsDeleteModalOpen(true);
  };

  // Handle confirm delete booking (both from database and Google Calendar)
  const handleConfirmDelete = async () => {
    if (!bookingToDelete) return;
    setIsDeleting(true);

    // Try to delete from Google Calendar first (if approved)
    if (bookingToDelete.status === BookingStatus.APPROVED && googleApi.isGapiInitialized) {
      const gapiResult: any = await deleteFromGoogleCalendar(bookingToDelete, 'all');
      if (!gapiResult.success && gapiResult.message !== "Dilewati: Tidak ada URL Kalender" && gapiResult.message !== "Event tidak ditemukan di Google Calendar") {
        showToast(`Peringatan: Gagal hapus dari Calendar (${gapiResult.message}), namun data tetap dihapus.`, 'warning');
      }
    }

    // Delete from database
    try {
      const response = await api(`/api/bookings/${bookingToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showToast("Booking berhasil dihapus dari database dan Google Calendar!", "success");
        // Refresh data
        fetchData();
        setSelectedBooking(null);
      } else {
        showToast("Gagal menghapus booking dari database", "error");
      }
    } catch (e) {
      showToast("Gagal menghapus booking", "error");
    }

    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    setBookingToDelete(null);
  };

  const ticketRef = useRef<HTMLDivElement>(null);

  const deleteFromGoogleCalendar = async (booking: Booking, option: 'single' | 'thisAndFollowing' | 'all') => {
    const room = rooms.find(r => r.id === booking.roomId);
    if (!room?.googleCalendarUrl) return { success: true, message: "Dilewati: Tidak ada URL Kalender" };
    const calendarId = getCalendarId(room.googleCalendarUrl);
    if (!calendarId) return { success: false, message: "ID Kalender Tidak Valid" };
    if (!googleApi.isAuthenticated) {
      googleApi.login();
      return { success: false, message: "Harap otorisasi Google Calendar lalu coba lagi." };
    }
    return await performDelete(calendarId, booking, room.name, option);
  };

  const performDelete = async (calendarId: string, booking: Booking, roomName: string, option: 'single' | 'thisAndFollowing' | 'all') => {
    try {
      const timeMin = new Date(`${booking.date}T00:00:00Z`).toISOString();
      const timeMax = new Date(`${booking.date}T23:59:59Z`).toISOString();
      const response = await window.gapi.client.calendar.events.list({
        calendarId, timeMin, timeMax, q: `[BOOKED] ${booking.purpose}`
      });
      const events = response.result.items;
      if (!events || events.length === 0) return { success: true, message: "Event tidak ditemukan di Google Calendar" };
      if (option === 'all') {
        for (const event of events) {
          await window.gapi.client.calendar.events.delete({ calendarId, eventId: event.id });
        }
        return { success: true, message: `Menghapus ${events.length} event dari Google Calendar` };
      } else if (option === 'thisAndFollowing') {
        const allEvents = await window.gapi.client.calendar.events.list({
          calendarId, timeMin, q: `[BOOKED] ${booking.purpose}`
        });
        for (const event of allEvents.result.items) {
          await window.gapi.client.calendar.events.delete({ calendarId, eventId: event.id });
        }
        return { success: true, message: "Menghapus event ini dan event selanjutnya" };
      } else {
        await window.gapi.client.calendar.events.delete({ calendarId, eventId: events[0].id });
        return { success: true, message: "Event dihapus dari Google Calendar" };
      }
    } catch (error: any) {
      console.error("GAPI Delete Error:", error);
      return { success: false, message: error.result?.error?.message || "Kesalahan GAPI" };
    }
  };

  const handleDeleteCalendarClick = (booking: BookingWithTech) => {
    setBookingToDeleteCalendar(booking);
    setDeleteOption('single');
    setIsDeleteCalendarModalOpen(true);
  };

  const handleConfirmDeleteCalendar = async () => {
    if (!bookingToDeleteCalendar) return;
    setIsDeleting(true);
    const result: any = await deleteFromGoogleCalendar(bookingToDeleteCalendar, deleteOption);
    if (!result.success) showToast(`Gagal: ${result.message}`, 'error');
    else showToast(result.message, 'success');
    setIsDeleting(false);
    setIsDeleteCalendarModalOpen(false);
    setBookingToDeleteCalendar(null);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [bkRes, stRes] = await Promise.all([
        api('/api/bookings'), api('/api/staff')
      ]);
      if (bkRes.ok) setBookings(await bkRes.json());
      if (stRes.ok) {
        const staffData = await stRes.json();
        setStaffList(staffData.map((s: any) => ({
          id: s.id, name: s.nama, jabatan: s.jabatan, status: s.status
        })).filter((s: LabStaff) => s.status === 'Aktif'));
      }
    } catch (e) { console.error(e); }
  };

  const getRoomName = (roomId: string) => rooms.find(r => r.id === roomId)?.name || 'Ruangan Tidak Diketahui';

  const getCalendarId = (input: string) => {
    if (!input) return null;
    if (!input.startsWith('http')) return input;
    try { return new URL(input).searchParams.get('src') || null; } catch (e) { return null; }
  };

  const addToGoogleCalendar = async (booking: Booking) => {
    const room = rooms.find(r => r.id === booking.roomId);
    if (!room?.googleCalendarUrl) return { success: true, message: "Dilewati: Tidak ada URL Kalender" };
    const calendarId = getCalendarId(room.googleCalendarUrl);
    if (!calendarId) return { success: false, message: "ID Kalender Tidak Valid" };
    if (!googleApi.isAuthenticated) {
      googleApi.login();
      return { success: false, message: "Harap otorisasi Google Calendar lalu coba lagi." };
    }
    return await insertEvent(calendarId, booking, room.name);
  };

  const insertEvent = async (calendarId: string, booking: Booking, roomName: string) => {
    try {
      const startDateTime = new Date(`${booking.date}T${booking.startTime}:00`);
      const endDateTime = new Date(`${booking.date}T${booking.endTime}:00`);
      await window.gapi.client.calendar.events.insert({
        calendarId,
        resource: {
          summary: `[BOOKED] ${booking.purpose}`,
          location: roomName,
          description: `Peminjam: ${booking.userName}\nPJ: ${booking.responsiblePerson}\nKontak: ${booking.contactPerson}\n\nDisetujui via CORE.FTI.`,
          start: { dateTime: startDateTime.toISOString() },
          end: { dateTime: endDateTime.toISOString() }
        }
      });
      return { success: true, message: "Disinkronkan ke Google Calendar" };
    } catch (error: any) {
      console.error("GAPI Error:", error);
      return { success: false, message: error.result?.error?.message || "Kesalahan GAPI" };
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus, techData?: { pic: string[], needs: string }, reason?: string) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    setProcessingId(id);
    if (newStatus === BookingStatus.APPROVED && googleApi.isGapiInitialized) {
      const gapiResult: any = await addToGoogleCalendar(booking);
      if (!gapiResult.success && gapiResult.message !== "Dilewati: Tidak ada URL Kalender") {
        showToast(`Peringatan: Gagal sinkron ke Calendar (${gapiResult.message}), namun status tetap diupdate.`, 'warning');
      } else if (gapiResult.success) {
        showToast("Berhasil sinkronisasi ke Google Calendar!", "success");
      }
    }
    await api(`/api/bookings/${id}/status`, {
      method: 'PUT',
      data: {
        status: newStatus,
        techSupportPic: techData?.pic || [],
        techSupportNeeds: techData?.needs || '',
        rejectionReason: reason
      }
    });
    fetchData();
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking({
        ...selectedBooking,
        status: newStatus,
        techSupportPic: techData?.pic || [],
        techSupportPicName: staffList.filter(s => techData?.pic.includes(s.id)).map(s => s.name).join(', '),
        techSupportNeeds: techData?.needs,
        rejectionReason: reason
      });
    }
    const isCancellation = booking.status === BookingStatus.APPROVED && newStatus === BookingStatus.REJECTED;
    const message = newStatus === BookingStatus.APPROVED
      ? `Peminjaman ${booking.userName} berhasil disetujui.`
      : isCancellation
        ? `Peminjaman ${booking.userName} berhasil dibatalkan.`
        : `Peminjaman ${booking.userName} telah ditolak.`;
    const type = newStatus === BookingStatus.APPROVED ? 'success' : 'warning';
    showToast(message, type);
    addNotification(
      newStatus === BookingStatus.APPROVED ? 'Peminjaman Disetujui' : (isCancellation ? 'Peminjaman Dibatalkan' : 'Peminjaman Ditolak'),
      isCancellation ? `Admin membatalkan peminjaman ${booking.userName} karena keadaan darurat.` : `Admin telah memverifikasi permintaan dari ${booking.userName}.`,
      type
    );
    setProcessingId(null);
  };

  const handleApproveClick = (booking: BookingWithTech) => {
    setBookingToApprove(booking);
    setApprovalData({ pic: [], needs: '' });
    setIsApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (bookingToApprove) {
      setIsApprovalModalOpen(false);
      await handleUpdateStatus(bookingToApprove.id, BookingStatus.APPROVED, approvalData);
      setBookingToApprove(null);
    }
  };

  const handleRejectClick = (booking: BookingWithTech) => {
    setBookingToReject(booking);
    setRejectionReason('');
    setIsRejectionModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (bookingToReject) {
      const isCancellation = bookingToReject.status === BookingStatus.APPROVED;
      if (isCancellation && googleApi.isGapiInitialized) {
        const gapiResult: any = await deleteFromGoogleCalendar(bookingToReject, 'all');
        if (!gapiResult.success && gapiResult.message !== "Dilewati: Tidak ada URL Kalender" && gapiResult.message !== "Event tidak ditemukan di Google Calendar") {
          showToast(`Peringatan: Gagal hapus dari Calendar (${gapiResult.message}), namun status tetap diupdate.`, 'warning');
        } else if (gapiResult.success) {
          showToast("Event dihapus dari Google Calendar!", "success");
        }
      }
      setIsRejectionModalOpen(false);
      await handleUpdateStatus(bookingToReject.id, BookingStatus.REJECTED, undefined, rejectionReason);
      setBookingToReject(null);
    }
  };

  const handleSaveTechData = async () => {
    if (!selectedBooking) return;
    try {
      await api(`/api/bookings/${selectedBooking.id}/tech-support`, {
        method: 'PUT',
        data: { techSupportPic: editTechData.pic, techSupportNeeds: editTechData.needs }
      });
      const staffName = staffList.filter(s => editTechData.pic.includes(s.id)).map(s => s.name).join(', ');
      const updatedBooking = { ...selectedBooking, techSupportPic: editTechData.pic, techSupportPicName: staffName, techSupportNeeds: editTechData.needs };
      setSelectedBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updatedBooking : b));
      setIsEditingTech(false);
      showToast("Data teknis berhasil diperbarui", "success");
    } catch (e) {
      showToast("Gagal menyimpan data teknis", "error");
    }
  };

  const handleViewFile = async (e: React.MouseEvent, fileData: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(fileData);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      showToast("Gagal membuka file proposal.", "error");
    }
  };

  const handleShareImage = async () => {
    if (!ticketRef.current || !selectedBooking) return;
    try {
      showToast("Sedang membuat gambar...", "info");
      const canvas = await html2canvas(ticketRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Booking_${selectedBooking.userName}_${selectedBooking.date}.png`;
      link.click();
      showToast("Gambar berhasil didownload!", "success");
    } catch (error) {
      console.error("Gagal membuat gambar", error);
      showToast("Gagal membuat gambar.", "error");
    }
  };

  const handleExportExcel = async () => {
    try {
      showToast("Mendownload laporan...", "info");
      const response = await api('/api/bookings/export');
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Jadwal_Lab_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Laporan berhasil didownload", "success");
    } catch (e) {
      showToast("Gagal mendownload laporan", "error");
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    
    // Cek tanggal di semua jadwal (schedules)
    const matchesDate = !filterDate || (b.schedules && b.schedules.some((s: any) => new Date(s.date).toLocaleDateString('en-CA') === filterDate)) || b.date === filterDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const pendingCount = bookings.filter(b => b.status === BookingStatus.PENDING).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pesanan Ruang</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola persetujuan peminjaman ruangan</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium animate-pulse">
              <AlertCircle className="w-4 h-4 mr-2" />
              {pendingCount} Permintaan Menunggu Konfirmasi
            </div>
          )}
          <button onClick={() => setIsBookingModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium shadow-sm transition-all hover:scale-105">
            <Plus className="w-4 h-4 mr-2" /> Buat Pesanan
          </button>
        </div>
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
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              title="Filter Tanggal"
            />
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
            <button
              onClick={handleExportExcel}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm"
              title="Download Laporan Excel"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
            </button>
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
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBookings.length > 0 ? filteredBookings.map((booking) => (
                <tr
                  key={booking.id}
                  onClick={() => {
                    setSelectedBooking(booking);
                    setIsEditingTech(false);
                    setEditTechData({ pic: booking.techSupportPic || [], needs: booking.techSupportNeeds || '' });
                  }}
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
                    {booking.schedules && booking.schedules.length > 1 ? (
                       <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                          <Calendar className="w-3 h-3 mr-1" /> {booking.schedules.length} Jadwal (Lihat Detail)
                       </div>
                    ) : (
                        <div className="flex flex-col space-y-0.5 text-xs text-gray-500">
                          <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {booking.date}</span>
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {booking.startTime} - {booking.endTime}</span>
                        </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-200 max-w-xs">
                    <p className="line-clamp-2" title={booking.purpose}>{booking.purpose}</p>
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
                  <td className="px-6 py-4 text-right">
                    {booking.status === BookingStatus.PENDING && (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApproveClick(booking); }}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Setuju"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRejectClick(booking); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Tolak"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {booking.status === BookingStatus.APPROVED && (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRejectClick(booking); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Batalkan (Darurat)"
                        >
                          <AlertTriangle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-300 mb-3" />
                      <p>Tidak ada data peminjaman yang sesuai filter.</p>
                    </div>
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

            <div className="p-6 overflow-y-auto max-h-[70vh]">
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
                  
                  {/* Tampilkan List Jadwal di Modal Detail */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-gray-500 uppercase flex items-center"><Calendar className="w-4 h-4 mr-1"/> Jadwal Pemakaian</h5>
                    <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                        {selectedBooking.schedules && selectedBooking.schedules.length > 0 ? (
                            selectedBooking.schedules.map((sch: any, idx: number) => (
                                <div key={idx} className="px-3 py-2 text-sm flex justify-between border-b border-gray-100 dark:border-gray-600 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <span className="text-gray-800 dark:text-gray-200">{new Date(sch.date).toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400 ml-2">{sch.startTime?.slice(0,5)} - {sch.endTime?.slice(0,5)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">{selectedBooking.date} {selectedBooking.startTime} - {selectedBooking.endTime}</div>
                        )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Keperluan:</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-100 dark:border-gray-600">
                      {selectedBooking.purpose}
                    </p>
                    {selectedBooking.status === BookingStatus.REJECTED && selectedBooking.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
                        <span className="font-bold block text-xs uppercase mb-1">Alasan Penolakan:</span>
                        {selectedBooking.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Support Section */}
                {(selectedBooking.status === BookingStatus.APPROVED || selectedBooking.status === BookingStatus.REJECTED) && (
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase flex items-center">
                        <Wrench className="w-4 h-4 mr-2" /> Technical Support
                      </h4>
                      {!isEditingTech ? (
                        <button onClick={() => setIsEditingTech(true)} className="text-xs text-blue-600 hover:underline flex items-center">
                          <Edit className="w-3 h-3 mr-1" /> Edit Data Teknis
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => setIsEditingTech(false)} className="text-xs text-gray-500 hover:text-gray-700">Batal</button>
                          <button onClick={handleSaveTechData} className="text-xs text-green-600 hover:text-green-700 font-bold flex items-center">
                            <Save className="w-3 h-3 mr-1" /> Simpan
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      {isEditingTech ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">PIC Laboran</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {editTechData.pic.map(picId => {
                                const staff = staffList.find(s => s.id === picId);
                                return (
                                  <span key={picId} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    {staff?.name}
                                    <button type="button" onClick={() => setEditTechData(prev => ({ ...prev, pic: prev.pic.filter(id => id !== picId) }))} className="ml-1 text-blue-600 hover:text-blue-800">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                            <select
                              value=""
                              onChange={e => { if (e.target.value) setEditTechData(prev => ({ ...prev, pic: [...prev.pic, e.target.value] })) }}
                              className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">+ Tambah PIC</option>
                              {staffList.filter(s => !editTechData.pic.includes(s.id)).map(staff => (
                                <option key={staff.id} value={staff.id}>{staff.name} ({staff.jabatan})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Kebutuhan Alat</label>
                            <textarea
                              value={editTechData.needs}
                              onChange={e => setEditTechData({ ...editTechData, needs: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                              rows={3}
                              placeholder="Contoh: 2 Mic Wireless, Sound System, Kabel HDMI Panjang"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">PIC Bertugas:</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedBooking.techSupportPicName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Kebutuhan Alat:</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{selectedBooking.techSupportNeeds || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dokumen Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Surat Permohonan.pdf</p>
                    <p className="text-xs text-gray-500">Dokumen PDF</p>
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

              {/* Hidden Ticket for Image Generation */}
              <div className="absolute -left-[9999px] top-0">
                <div ref={ticketRef} className="w-[600px] bg-white p-8 border border-gray-200 rounded-xl font-sans">
                  <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
                    <div className="flex items-center gap-4">
                      <img src={nocLogo} alt="Logo" className="w-16 h-16 object-contain" />
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">CORE.FTI</h1>
                        <p className="text-sm text-gray-600">Fakultas Teknologi Informasi - UKSW</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold border border-green-200">APPROVED</span>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h2 className="text-lg font-bold text-gray-800 mb-1">{selectedBooking.purpose}</h2>
                      <p className="text-sm text-gray-600">Peminjam: {selectedBooking.userName} ({selectedBooking.userId})</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ruangan</p>
                        <p className="text-lg font-medium text-gray-900">{getRoomName(selectedBooking.roomId)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Waktu</p>
                        <p className="text-lg font-medium text-gray-900">{selectedBooking.date}</p>
                        <p className="text-md text-gray-700">{selectedBooking.startTime} - {selectedBooking.endTime}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Penanggung Jawab</p>
                        <p className="text-md font-medium text-gray-900">{selectedBooking.responsiblePerson}</p>
                        <p className="text-sm text-gray-600">{selectedBooking.contactPerson}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Technical Support</p>
                        <p className="text-md font-medium text-gray-900">{selectedBooking.techSupportPicName || '-'}</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Catatan Kebutuhan</p>
                      <p className="text-sm text-gray-700 italic">{selectedBooking.techSupportNeeds || 'Tidak ada kebutuhan khusus.'}</p>
                    </div>
                  </div>
                </div>)
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

              {selectedBooking.status === BookingStatus.APPROVED && (
                <>
                  <button
                    onClick={handleShareImage}
                    className="px-4 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center transition-colors"
                  >
                    <Share2 className="w-4 h-4 mr-2" /> Share Gambar
                  </button>
                  <button
                    onClick={() => handleDeleteCalendarClick(selectedBooking)}
                    className="px-4 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg flex items-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Hapus Calendar
                  </button>
                  <button
                    onClick={() => { setSelectedBooking(null); handleRejectClick(selectedBooking); }}
                    className="px-4 py-2 text-sm bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg flex items-center shadow-sm transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Batalkan
                  </button>
                  <button
                    onClick={() => { setSelectedBooking(null); handleDeleteClick(selectedBooking); }}
                    className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 border border-red-600 rounded-lg flex items-center shadow-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hapus Data
                  </button>
                </>
              )}

              {selectedBooking.status === BookingStatus.PENDING && (
                <>
                  <button
                    onClick={() => { setSelectedBooking(null); handleRejectClick(selectedBooking); }}
                    disabled={processingId === selectedBooking.id}
                    className="px-4 py-2 text-sm bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg flex items-center shadow-sm transition-colors disabled:opacity-50"
                  >
                    {processingId === selectedBooking.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Tolak
                  </button>
                  <button
                    onClick={() => { setSelectedBooking(null); handleApproveClick(selectedBooking); }}
                    disabled={processingId === selectedBooking.id}
                    className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center shadow-md transition-colors disabled:opacity-50"
                  >
                    {processingId === selectedBooking.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Setuju Peminjaman
                  </button>
                </>
              )}

              {selectedBooking.status === BookingStatus.REJECTED && (
                <button
                  onClick={() => { setSelectedBooking(null); handleDeleteClick(selectedBooking); }}
                  className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 border border-red-600 rounded-lg flex items-center shadow-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Data
                </button>
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

      {/* Approval Confirmation Modal */}
      <ApprovalModal 
        isOpen={isApprovalModalOpen} 
        booking={bookingToApprove} 
        rooms={rooms} 
        staffList={staffList} 
        approvalData={approvalData} 
        setApprovalData={setApprovalData} 
        onClose={() => setIsApprovalModalOpen(false)} 
        onConfirm={handleConfirmApproval} 
      />

      {/* Rejection Confirmation Modal */}
      <RejectionModal 
        isOpen={isRejectionModalOpen} 
        booking={bookingToReject} 
        rooms={rooms} 
        rejectionReason={rejectionReason} 
        setRejectionReason={setRejectionReason} 
        onClose={() => setIsRejectionModalOpen(false)} 
        onConfirm={handleConfirmRejection} 
      />

      {/* Delete Google Calendar Confirmation Modal */}
      <DeleteCalendarModal 
        isOpen={isDeleteCalendarModalOpen} 
        booking={bookingToDeleteCalendar} 
        deleteOption={deleteOption} 
        setDeleteOption={setDeleteOption} 
        isDeleting={isDeleting} 
        onClose={() => setIsDeleteCalendarModalOpen(false)} 
        onConfirm={handleConfirmDeleteCalendar} 
      />

      {/* Delete Booking Confirmation Modal */}
      <DeleteBookingModal 
        isOpen={isDeleteModalOpen} 
        booking={bookingToDelete} 
        rooms={rooms} 
        isDeleting={isDeleting} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleConfirmDelete} 
      />

      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center text-base">
                    <Plus className="w-5 h-5 mr-2 text-blue-600" />
                    Buat Pesanan Ruangan
                 </h3>
                 <button onClick={() => setIsBookingModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <BookingForm
                  rooms={rooms}
                  showToast={showToast}
                  onSuccess={() => { setIsBookingModalOpen(false); fetchData(); }}
                  onCancel={() => setIsBookingModalOpen(false)}
                />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PesananRuang;

// --- SUB-COMPONENTS FOR MODALS ---

const ApprovalModal = ({ isOpen, booking, rooms, staffList, approvalData, setApprovalData, onClose, onConfirm }: any) => {
  if (!isOpen || !booking) return null;
  const getRoomName = (roomId: string) => rooms.find((r: Room) => r.id === roomId)?.name || 'Ruangan Tidak Diketahui';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
          <h3 className="font-bold text-green-800 dark:text-green-400 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" /> Setuju Peminjaman
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Anda akan menyetujui peminjaman ruangan <strong>{getRoomName(booking.roomId)}</strong> untuk kegiatan <strong>{booking.purpose}</strong>.
          </p>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center"><Wrench className="w-3 h-3 mr-1" /> Data Technical Support (Opsional)</h4>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">PIC Laboran / Teknisi</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {approvalData.pic.map((picId: string) => {
                  const staff = staffList.find((s: LabStaff) => s.id === picId);
                  return (
                    <span key={picId} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {staff?.name}
                      <button type="button" onClick={() => setApprovalData((prev: any) => ({ ...prev, pic: prev.pic.filter((id: string) => id !== picId) }))} className="ml-1 text-blue-600 hover:text-blue-800">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <select
                value=""
                onChange={e => { if (e.target.value) setApprovalData((prev: any) => ({ ...prev, pic: [...prev.pic, e.target.value] })) }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">+ Tambah PIC</option>
                {staffList.filter((s: LabStaff) => !approvalData.pic.includes(s.id)).map((staff: LabStaff) => (
                  <option key={staff.id} value={staff.id}>{staff.name} ({staff.jabatan})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kebutuhan Teknis (Mic, Sound, dll)</label>
              <textarea
                value={approvalData.needs}
                onChange={e => setApprovalData({ ...approvalData, needs: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="Daftar alat yang dibutuhkan..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Batal</button>
            <button onClick={onConfirm} className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-md">Simpan & Setuju</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RejectionModal = ({ isOpen, booking, rooms, rejectionReason, setRejectionReason, onClose, onConfirm }: any) => {
  if (!isOpen || !booking) return null;
  const getRoomName = (roomId: string) => rooms.find((r: Room) => r.id === roomId)?.name || 'Ruangan Tidak Diketahui';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center">
            {booking.status === BookingStatus.APPROVED ? <AlertTriangle className="w-5 h-5 mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
            <span>{booking.status === BookingStatus.APPROVED ? 'Batalkan Peminjaman' : 'Tolak Peminjaman'}</span>
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Anda akan {booking.status === BookingStatus.APPROVED ? 'membatalkan' : 'menolak'} peminjaman ruangan <strong>{getRoomName(booking.roomId)}</strong>. Mohon berikan alasan {booking.status === BookingStatus.APPROVED ? 'pembatalan' : 'penolakan'} untuk peminjam.
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-red-500"
            rows={3}
            placeholder="Contoh: Ruangan sedang dalam perbaikan, Jadwal bentrok dengan kegiatan fakultas..."
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Batal</button>
            <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md">
              Simpan & {booking.status === BookingStatus.APPROVED ? 'Batalkan' : 'Tolak'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteCalendarModal = ({ isOpen, booking, deleteOption, setDeleteOption, isDeleting, onClose, onConfirm }: any) => {
  if (!isOpen || !booking) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center">
            <Trash2 className="w-5 h-5 mr-2" /> Hapus dari Google Calendar
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Pilih bagaimana ingin menghapus event <strong>"{booking.purpose}"</strong> dari Google Calendar:
          </p>
          <div className="space-y-2">
            {(['single', 'thisAndFollowing', 'all'] as const).map((opt) => (
              <label key={opt} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${deleteOption === opt ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <input type="radio" name="deleteOption" value={opt} checked={deleteOption === opt} onChange={() => setDeleteOption(opt)} className="mr-3" />
                <div>
                  {opt === 'single' && <><p className="text-sm font-medium text-gray-900 dark:text-white">Hapus event ini saja</p><p className="text-xs text-gray-500">Menghapus hanya event pada tanggal {booking.date}</p></>}
                  {opt === 'thisAndFollowing' && <><p className="text-sm font-medium text-gray-900 dark:text-white">Ini dan event selanjutnya</p><p className="text-xs text-gray-500">Menghapus event ini dan semua event di tanggal yang sama</p></>}
                  {opt === 'all' && <><p className="text-sm font-medium text-gray-900 dark:text-white">Semua event</p><p className="text-xs text-gray-500">Menghapus semua event yang cocok dengan kegiatan ini</p></>}
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Batal</button>
            <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md flex items-center disabled:opacity-50">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus dari Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteBookingModal = ({ isOpen, booking, rooms, isDeleting, onClose, onConfirm }: any) => {
  if (!isOpen || !booking) return null;
  const getRoomName = (roomId: string) => rooms.find((r: Room) => r.id === roomId)?.name || 'Ruangan Tidak Diketahui';
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center">
            <Trash2 className="w-5 h-5 mr-2" /> Hapus Data Peminjaman
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">⚠️ Peringatan! Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Anda akan menghapus data peminjaman berikut secara permanen:</p>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-2">
            <div className="flex justify-between"><span className="text-xs text-gray-500">Peminjam:</span><span className="text-sm font-medium text-gray-900 dark:text-white">{booking.userName}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Ruangan:</span><span className="text-sm font-medium text-gray-900 dark:text-white">{getRoomName(booking.roomId)}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Tanggal:</span><span className="text-sm font-medium text-gray-900 dark:text-white">{booking.date}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Keperluan:</span><span className="text-sm font-medium text-gray-900 dark:text-white">{booking.purpose}</span></div>
          </div>
          {booking.status === BookingStatus.APPROVED && (
            <p className="text-xs text-orange-600 dark:text-orange-400">* Jika peminjaman sudah disetujui, event di Google Calendar juga akan dihapus.</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Batal</button>
            <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md flex items-center disabled:opacity-50">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus Permanen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
