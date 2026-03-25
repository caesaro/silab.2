import React, { useState } from 'react';
import { Room, Booking, Role } from '../types';
import { MapPin, Plus, Trash2, Loader2, Check, FileText, User, Search } from 'lucide-react';
import { api } from '../services/api';
import SearchableSelect, { SelectOption } from './SearchableSelect';

interface BookingFormProps {
  rooms: Room[];
  initialRoomId?: string;
  initialData?: Partial<Booking> | null;
  onSuccess: () => void;
  onCancel: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
  rooms,
  initialRoomId,
  initialData,
  onSuccess,
  onCancel,
  showToast,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(initialData?.roomId || initialRoomId || '');

  const userRole = (localStorage.getItem('currentRole') as Role) || Role.USER;
  const canManage = userRole === Role.ADMIN || userRole === Role.LABORAN;
  const [autoApprove, setAutoApprove] = useState(true);

  const [bookingForm, setBookingForm] = useState<Partial<Booking>>({
    purpose: initialData?.purpose || '',
    responsiblePerson: initialData?.responsiblePerson || '',
    contactPerson: initialData?.contactPerson || '',
    proposalFile: initialData?.proposalFile || '',
  });
  const [bookingSchedules, setBookingSchedules] = useState<{ date: string; startTime: string; endTime: string }[]>([
    ...(initialData?.schedules && initialData.schedules.length > 0 
      ? initialData.schedules.map((s: any) => ({
          date: s.date ? new Date(s.date).toLocaleDateString('en-CA') : '',
          startTime: s.startTime?.slice(0, 5) || '',
          endTime: s.endTime?.slice(0, 5) || ''
        }))
      : [{ date: '', startTime: '', endTime: '' }])
  ]);
  const [bookingFile, setBookingFile] = useState<File | null>(null);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const roomOptions: SelectOption[] = rooms.map(r => ({
    value: r.id,
    label: r.name,
    subLabel: `Kapasitas: ${r.capacity}`
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        showToast('File harus berformat PDF!', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file maksimal 5MB!', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBookingFile(file);
        setBookingForm(prev => ({ ...prev, proposalFile: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addScheduleRow = () => {
    setBookingSchedules([...bookingSchedules, { date: '', startTime: '', endTime: '' }]);
  };

  const removeScheduleRow = (index: number) => {
    if (bookingSchedules.length > 1) {
      setBookingSchedules(bookingSchedules.filter((_, i) => i !== index));
    }
  };

  const updateScheduleRow = (index: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    const newSchedules = [...bookingSchedules];
    newSchedules[index][field] = value;
    setBookingSchedules(newSchedules);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      showToast('Silakan pilih ruangan terlebih dahulu.', 'warning');
      return;
    }
    if (!bookingFile && !bookingForm.proposalFile) {
      showToast('Mohon upload surat permohonan.', 'warning');
      return;
    }
    const isScheduleValid = bookingSchedules.every(s => s.date && s.startTime && s.endTime);
    if (!isScheduleValid) {
      showToast('Mohon lengkapi semua jadwal.', 'warning');
      return;
    }

    const isTimeValid = bookingSchedules.every(s => s.endTime > s.startTime);
    if (!isTimeValid) {
      showToast('Jam selesai harus lebih dari jam mulai pada semua baris jadwal.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = localStorage.getItem('userId') || 'GUEST';
      const payload = {
        roomId: selectedRoomId,
        userId: userId,
        responsiblePerson: bookingForm.responsiblePerson,
        contactPerson: bookingForm.contactPerson,
        purpose: bookingForm.purpose,
        proposalFile: bookingForm.proposalFile,
        schedules: bookingSchedules,
        autoApprove: canManage ? autoApprove : false,
      };

      let res;
      if (initialData?.id) {
        res = await api(`/api/bookings/${initialData.id}`, {
          method: 'PUT',
          data: payload,
        });
      } else {
        res = await api('/api/bookings', {
          method: 'POST',
          data: payload,
        });
      }

      if (res.ok) {
        showToast(initialData?.id ? 'Permohonan peminjaman berhasil diperbarui!' : 'Permohonan peminjaman berhasil dikirim!', 'success');
        onSuccess();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengirim permohonan.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Terjadi kesalahan koneksi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruangan</label>
          <div>
            {initialRoomId && selectedRoom ? (
              <input
                type="text"
                value={`${selectedRoom.name} (Kapasitas: ${selectedRoom.capacity})`}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 cursor-not-allowed"
              />
            ) : (
              <SearchableSelect
                options={roomOptions}
                value={selectedRoomId}
                onChange={(val) => setSelectedRoomId(val)}
                placeholder="-- Pilih Ruangan --"
                searchPlaceholder="Cari nama ruangan..."
                required
              />
            )}
          </div>
        </div>

        <div className="space-y-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jadwal Pemakaian</label>
            <button type="button" onClick={addScheduleRow} className="text-sm text-blue-600 hover:underline flex items-center font-medium">
              <Plus className="w-4 h-4 mr-1" /> Tambah Hari
            </button>
          </div>
          {bookingSchedules.map((schedule, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 items-end animate-fade-in-up">
              <div className="flex-1 w-full">
                <label className="block text-xs text-gray-500 mb-1">Tanggal</label>
                <input type="date" min={new Date().toLocaleDateString('en-CA')} required value={schedule.date} onChange={e => updateScheduleRow(index, 'date', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs text-gray-500 mb-1">Jam Mulai</label>
                <input type="time" required value={schedule.startTime} onChange={e => updateScheduleRow(index, 'startTime', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs text-gray-500 mb-1">Jam Selesai</label>
                <input type="time" required value={schedule.endTime} onChange={e => updateScheduleRow(index, 'endTime', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              {bookingSchedules.length > 1 && (
                <button type="button" onClick={() => removeScheduleRow(index)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mb-[1px] transition-colors" title="Hapus baris">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Kegiatan</label>
          <input type="text" required value={bookingForm.purpose} onChange={e => setBookingForm({ ...bookingForm, purpose: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="Contoh: Rapat Koordinasi Panitia Tech Days" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Penanggung Jawab</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input type="text" required value={bookingForm.responsiblePerson} onChange={e => setBookingForm({ ...bookingForm, responsiblePerson: e.target.value })} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="Nama Lengkap" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kontak Person (HP/WA)</label>
            <input type="tel" required value={bookingForm.contactPerson} onChange={e => setBookingForm({ ...bookingForm, contactPerson: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="08123xxxxxxx" />
          </div>
        </div>

      {!initialData?.id && canManage && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="autoApprove" 
              checked={autoApprove} 
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
            />
            <label htmlFor="autoApprove" className="text-sm font-medium text-blue-900 dark:text-blue-300 cursor-pointer select-none">
              Setujui Otomatis (Auto-Accept)
            </label>
          </div>
          {autoApprove && (
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 ml-6">
              Pemesanan akan langsung berstatus Disetujui (Verifikasi Google Calendar harus dilakukan manual di menu Pesanan Ruang jika diperlukan).
            </p>
          )}
        </div>
      )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Surat Permohonan (PDF, Max 5MB)</label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <input type="file" id="file-upload-component" accept="application/pdf" onChange={handleFileChange} className="hidden" />
            <label htmlFor="file-upload-component" className="cursor-pointer flex flex-col items-center">
              <FileText className={`w-8 h-8 mb-2 ${bookingFile ? 'text-blue-600' : 'text-gray-400'}`} />
              {bookingFile ? (
                <span className="text-sm font-medium text-blue-600">{bookingFile.name}</span>
              ) : bookingForm.proposalFile ? (
                <span className="text-sm font-medium text-blue-600">Surat sudah diupload (PDF) - Klik untuk mengganti</span>
              ) : (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Klik untuk upload surat</span>
                  <span className="text-xs text-gray-500 mt-1">Format .pdf, Maksimal 5MB</span>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            Batal
          </button>
          <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            {isSubmitting ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Kirim Permohonan')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;