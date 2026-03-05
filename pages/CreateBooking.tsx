import React, { useState, useEffect } from 'react';
import { Room, Booking } from '../types';
import { Calendar, Clock, User, FileText, Check, Loader2, Plus, Trash2, Upload, MapPin } from 'lucide-react';
import { api } from '../services/api';

interface CreateBookingProps {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigate: (page: string) => void;
}

const CreateBooking: React.FC<CreateBookingProps> = ({ showToast, onNavigate }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [bookingForm, setBookingForm] = useState<Partial<Booking>>({
    purpose: '', responsiblePerson: '', contactPerson: '', proposalFile: ''
  });
  const [bookingSchedules, setBookingSchedules] = useState<{date: string, startTime: string, endTime: string}[]>([
    { date: '', startTime: '', endTime: '' }
  ]);
  const [bookingFile, setBookingFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const res = await api('/api/rooms');
        if (res.ok) {
            setRooms(await res.json());
        }
      } catch (e) {
        console.error(e);
        showToast("Gagal memuat data ruangan", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert("File harus berformat PDF!");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file maksimal 5MB!");
        return;
      }
      setBookingFile(file);
      setBookingForm(prev => ({ ...prev, proposalFile: file.name }));
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
        showToast("Silakan pilih ruangan terlebih dahulu.", "warning");
        return;
    }
    if (!bookingFile) {
        showToast("Mohon upload surat permohonan.", "warning");
        return;
    }

    // Validasi jadwal kosong
    const isScheduleValid = bookingSchedules.every(s => s.date && s.startTime && s.endTime);
    if (!isScheduleValid) {
        showToast("Mohon lengkapi semua jadwal.", "warning");
        return;
    }

    setIsSubmitting(true);
    try {
        const userId = localStorage.getItem('userId') || 'GUEST';
        
        // TODO: Implementasi upload file ke Google Drive / Server di sini
        // Untuk saat ini kita kirim nama file saja sesuai skema database
        
        const payload = {
            roomId: selectedRoomId,
            userId: userId,
            responsiblePerson: bookingForm.responsiblePerson,
            contactPerson: bookingForm.contactPerson,
            purpose: bookingForm.purpose,
            proposalFile: bookingForm.proposalFile, // Idealnya URL hasil upload
            schedules: bookingSchedules
        };

        const res = await api('/api/bookings', {
            method: 'POST',
            data: payload
        });

        if (res.ok) {
            showToast("Permohonan peminjaman berhasil dikirim!", "success");
            onNavigate('bookings'); // Redirect ke "Pemesanan Saya"
        } else {
            const err = await res.json();
            showToast(err.error || "Gagal mengirim permohonan.", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Terjadi kesalahan koneksi.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buat Pesanan Baru</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Isi formulir untuk mengajukan peminjaman ruangan</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Ruangan</label>
                <div className="relative">
                    <MapPin className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select 
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        required
                    >
                        <option value="">-- Pilih Ruangan --</option>
                        {rooms.map(room => (
                            <option key={room.id} value={room.id}>
                                {room.name} (Kapasitas: {room.capacity})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Schedule Section */}
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
                            <input type="date" required 
                                value={schedule.date} 
                                onChange={e => updateScheduleRow(index, 'date', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" 
                            />
                        </div>
                        <div className="w-full sm:w-32">
                            <label className="block text-xs text-gray-500 mb-1">Jam Mulai</label>
                            <input type="time" required 
                                value={schedule.startTime} 
                                onChange={e => updateScheduleRow(index, 'startTime', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" 
                            />
                        </div>
                        <div className="w-full sm:w-32">
                            <label className="block text-xs text-gray-500 mb-1">Jam Selesai</label>
                            <input type="time" required 
                                value={schedule.endTime} 
                                onChange={e => updateScheduleRow(index, 'endTime', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 text-sm" 
                            />
                        </div>
                        {bookingSchedules.length > 1 && (
                            <button type="button" onClick={() => removeScheduleRow(index)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mb-[1px] transition-colors" title="Hapus baris">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Purpose */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Kegiatan</label>
                <input type="text" required 
                    value={bookingForm.purpose} 
                    onChange={e => setBookingForm({...bookingForm, purpose: e.target.value})}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
                    placeholder="Contoh: Rapat Koordinasi Panitia Tech Days"
                />
            </div>

            {/* Responsible Person Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Penanggung Jawab</label>
                    <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" required 
                        value={bookingForm.responsiblePerson} 
                        onChange={e => setBookingForm({...bookingForm, responsiblePerson: e.target.value})}
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
                        placeholder="Nama Lengkap"
                    />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kontak Person (HP/WA)</label>
                    <input type="tel" required 
                        value={bookingForm.contactPerson} 
                        onChange={e => setBookingForm({...bookingForm, contactPerson: e.target.value})}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
                        placeholder="08123xxxxxxx"
                    />
                </div>
            </div>

            {/* File Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Surat Permohonan (PDF, Max 5MB)</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input 
                        type="file" 
                        id="file-upload-new" 
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden" 
                    />
                    <label htmlFor="file-upload-new" className="cursor-pointer flex flex-col items-center">
                        <FileText className={`w-8 h-8 mb-2 ${bookingFile ? 'text-blue-600' : 'text-gray-400'}`} />
                        {bookingFile ? (
                            <span className="text-sm font-medium text-blue-600">{bookingFile.name}</span>
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
                <button type="button" onClick={() => onNavigate('dashboard')} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} 
                    {isSubmitting ? 'Mengirim...' : 'Kirim Permohonan'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBooking;