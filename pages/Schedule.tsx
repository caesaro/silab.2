import React, { useState } from 'react';
import { MOCK_BOOKINGS, MOCK_ROOMS } from '../services/mockData';
import { Booking, BookingStatus, Role, Room } from '../types';
import { 
  ChevronLeft, ChevronRight, Search, Filter, Plus, 
  Calendar as CalendarIcon, Clock, MapPin, User, RefreshCw, X, Check, Trash2 
} from 'lucide-react';

interface ScheduleProps {
  role: Role;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const Schedule: React.FC<ScheduleProps> = ({ role, showToast }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoom, setFilterRoom] = useState('All');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Booking>>({
    roomId: '', date: '', startTime: '', endTime: '', purpose: '', userName: 'Admin', responsiblePerson: 'Admin', contactPerson: '-', status: BookingStatus.APPROVED
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSyncGoogle = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast("Berhasil sinkronisasi dengan Google Calendar. 3 Jadwal diperbarui.", "success");
      // Simulate adding a Google Calendar event
      const newEvent: Booking = {
        id: `gcal-${Date.now()}`,
        roomId: '1',
        userId: 'gcal-bot',
        userName: 'Google Calendar Sync',
        purpose: 'Maintenance Rutin (Synced)',
        responsiblePerson: 'System',
        contactPerson: '-',
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15).toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '09:00',
        status: BookingStatus.APPROVED
      };
      setBookings(prev => [...prev, newEvent]);
    }, 2000);
  };

  // CRUD
  const handleDayClick = (day: number) => {
    if (role === Role.USER) return; // Only Admin/Laboran can click empty slot to add
    
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1).toISOString().split('T')[0];
    setFormData({
      roomId: MOCK_ROOMS[0].id,
      date: dateStr,
      startTime: '08:00',
      endTime: '10:00',
      purpose: '',
      userName: role === Role.ADMIN ? 'Admin' : 'Laboran',
      responsiblePerson: role === Role.ADMIN ? 'Admin' : 'Laboran',
      contactPerson: '-',
      status: BookingStatus.APPROVED
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEditBooking = (e: React.MouseEvent, booking: Booking) => {
    e.stopPropagation();
    if (role === Role.USER) return;
    setFormData(booking);
    setEditingId(booking.id);
    setIsModalOpen(true);
  };

  const handleDeleteBooking = () => {
    if (!editingId) return;
    if (confirm("Hapus jadwal ini?")) {
      setBookings(prev => prev.filter(b => b.id !== editingId));
      setIsModalOpen(false);
      showToast("Jadwal berhasil dihapus", "info");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setBookings(prev => prev.map(b => b.id === editingId ? { ...b, ...formData } as Booking : b));
      showToast("Jadwal berhasil diperbarui", "success");
    } else {
      const newBooking = { ...formData, id: Date.now().toString(), userId: 'admin-entry' } as Booking;
      setBookings(prev => [...prev, newBooking]);
      showToast("Jadwal berhasil ditambahkan", "success");
    }
    setIsModalOpen(false);
  };

  // Filter Logic
  const filteredBookings = bookings.filter(b => {
    const bDate = new Date(b.date);
    const inCurrentMonth = bDate.getMonth() === currentDate.getMonth() && bDate.getFullYear() === currentDate.getFullYear();
    const matchesSearch = b.purpose.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoom = filterRoom === 'All' || b.roomId === filterRoom;
    return inCurrentMonth && matchesSearch && matchesRoom && b.status === BookingStatus.APPROVED;
  });

  const getBookingsForDay = (day: number) => {
    return filteredBookings.filter(b => parseInt(b.date.split('-')[2]) === day);
  };

  const getRoomColor = (roomId: string) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700'];
    const index = MOCK_ROOMS.findIndex(r => r.id === roomId);
    return colors[index % colors.length] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal Laboratorium</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kalender pemakaian ruangan FTI UKSW</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
           <button 
              onClick={handleSyncGoogle}
              disabled={isSyncing}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium flex items-center shadow-sm disabled:opacity-50"
           >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> 
              {isSyncing ? 'Syncing...' : 'Sync Google Calendar'}
           </button>
           {(role === Role.ADMIN || role === Role.LABORAN) && (
             <button 
                onClick={() => {
                  setFormData({
                    roomId: MOCK_ROOMS[0].id, date: new Date().toISOString().split('T')[0], startTime: '08:00', endTime: '10:00', 
                    purpose: '', userName: 'Admin', responsiblePerson: 'Admin', contactPerson: '-', status: BookingStatus.APPROVED
                  });
                  setEditingId(null);
                  setIsModalOpen(true);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm"
             >
                <Plus className="w-4 h-4 mr-2" /> Jadwal Manual
             </button>
           )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300"/></button>
             <h2 className="text-lg font-bold text-gray-900 dark:text-white w-40 text-center">
                {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
             </h2>
             <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300"/></button>
         </div>

         <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari kegiatan..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
                />
             </div>
             <div className="flex items-center gap-2">
                 <Filter className="w-4 h-4 text-gray-400" />
                 <select 
                    value={filterRoom}
                    onChange={(e) => setFilterRoom(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                 >
                    <option value="All">Semua Ruangan</option>
                    {MOCK_ROOMS.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                 </select>
             </div>
         </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
         <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => (
               <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {day}
               </div>
            ))}
         </div>
         <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] divide-x divide-y divide-gray-200 dark:divide-gray-700">
            {/* Empty cells for previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
               <div key={`empty-${i}`} className="bg-gray-50/50 dark:bg-gray-800/50"></div>
            ))}
            
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
               const day = i + 1;
               const dayBookings = getBookingsForDay(day);
               const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

               return (
                  <div 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    className={`p-2 relative group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                  >
                     <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {day}
                     </div>
                     <div className="space-y-1">
                        {dayBookings.map(booking => {
                           const roomName = MOCK_ROOMS.find(r => r.id === booking.roomId)?.name.split(' ')[1] || 'Room'; // Shorten name
                           return (
                              <div 
                                 key={booking.id}
                                 onClick={(e) => handleEditBooking(e, booking)}
                                 className={`px-2 py-1 rounded text-[10px] font-medium truncate border-l-2 border-blue-500 shadow-sm ${getRoomColor(booking.roomId)} hover:opacity-80 transition-opacity`}
                                 title={`${booking.startTime}-${booking.endTime}: ${booking.purpose} (${booking.userName})`}
                              >
                                 {booking.startTime} {roomName}
                              </div>
                           )
                        })}
                     </div>
                     {(role === Role.ADMIN || role === Role.LABORAN) && (
                        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Plus className="w-4 h-4 text-gray-400 bg-white dark:bg-gray-800 rounded-full shadow-sm" />
                        </div>
                     )}
                  </div>
               );
            })}
         </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white">
                    {editingId ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruangan</label>
                    <select 
                       required
                       value={formData.roomId}
                       onChange={e => setFormData({...formData, roomId: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                       {MOCK_ROOMS.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal</label>
                    <input 
                       type="date" required 
                       value={formData.date}
                       onChange={e => setFormData({...formData, date: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mulai</label>
                        <input 
                           type="time" required 
                           value={formData.startTime}
                           onChange={e => setFormData({...formData, startTime: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selesai</label>
                        <input 
                           type="time" required 
                           value={formData.endTime}
                           onChange={e => setFormData({...formData, endTime: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Kegiatan / Peminjam</label>
                    <input 
                       type="text" required 
                       value={formData.purpose}
                       onChange={e => setFormData({...formData, purpose: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                       placeholder="Kuliah Tamu..."
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Penanggung Jawab</label>
                        <input 
                           type="text" required 
                           value={formData.responsiblePerson}
                           onChange={e => setFormData({...formData, responsiblePerson: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kontak (HP/WA)</label>
                        <input 
                           type="text" required 
                           value={formData.contactPerson}
                           onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                 </div>

                 {/* Google Calendar Sync Indicator (Simulation) */}
                 <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-blue-600 mr-2" />
                    <div className="text-xs text-blue-800 dark:text-blue-300">
                        Akan disinkronkan ke Google Calendar ruangan terkait secara otomatis.
                    </div>
                 </div>

                 <div className="pt-4 flex justify-between border-t border-gray-200 dark:border-gray-700 mt-2">
                    {editingId && (
                       <button type="button" onClick={handleDeleteBooking} className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center">
                          <Trash2 className="w-4 h-4 mr-1" /> Hapus
                       </button>
                    )}
                    <div className="flex space-x-2 ml-auto">
                       <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          Batal
                       </button>
                       <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all">
                          <Check className="w-4 h-4 mr-2" /> Simpan
                       </button>
                    </div>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;