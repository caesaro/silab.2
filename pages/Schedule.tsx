import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_ROOMS } from '../services/mockData';
import { Role } from '../types';
import { 
  Calendar as CalendarIcon, Filter, ExternalLink, Clock, MapPin, RefreshCw, AlertCircle, Loader2, LogIn, ChevronRight, Plus, ChevronLeft,
  X, Save, Repeat, Type, AlignLeft
} from 'lucide-react';

// Declare global types for Google API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Konfigurasi Google API
const CLIENT_ID = '828476305239-7hilvfjvadt8ndn9br7n1upmdso38ou8.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDMKoa430rirp8g8bBU3Xt-IE5EKZjiZWQ';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];

interface ScheduleProps {
  role: Role;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  isDarkMode: boolean;
}

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink: string;
}

const Schedule: React.FC<ScheduleProps> = ({ role, showToast, isDarkMode }) => {
  const [filterRoom, setFilterRoom] = useState(MOCK_ROOMS[0].id); // Default to first room
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGapiInitialized, setIsGapiInitialized] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Form State for Add Event
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    summary: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00',
    recurrence: 'NONE', // NONE, DAILY, WEEKLY, MONTHLY
    recurrenceEnd: ''
  });
  
  const selectedRoom = MOCK_ROOMS.find(r => r.id === filterRoom);

  // Helper: Extract Calendar ID from Embed URL
  const getCalendarId = (input: string) => {
    if (!input) return null;
    const cleanInput = input.trim();
    if (!cleanInput.startsWith('http')) {
        return cleanInput;
    }
    try {
      const urlObj = new URL(input);
      const src = urlObj.searchParams.get('src');
      return src ? decodeURIComponent(src) : null;
    } catch (e) {
      return null;
    }
  };

  // 1. Load Google API Scripts
  useEffect(() => {
    const loadScripts = () => {
      if (typeof window.gapi === 'undefined') {
        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.onload = () => {
          window.gapi.load('client', initializeGapiClient);
        };
        document.body.appendChild(script1);
      } else {
        window.gapi.load('client', initializeGapiClient);
      }

      if (typeof window.google === 'undefined') {
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.onload = () => initializeGisClient();
        document.body.appendChild(script2);
      } else {
        initializeGisClient();
      }
    };

    loadScripts();
  }, []);

  // 2. Initialize GAPI Client
  const initializeGapiClient = async () => {
    try {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      setIsGapiInitialized(true);
    } catch (error: any) {
      console.error("Gagal inisialisasi GAPI:", error);
      showToast(`Gagal memuat Google API: ${error?.message || JSON.stringify(error)}`, "error");
    }
  };

  // 3. Initialize GIS Client (Auth)
  const initializeGisClient = () => {
    // Tentukan scope berdasarkan role: Admin dapat Write, User hanya Read
    const scope = role === Role.ADMIN 
      ? 'https://www.googleapis.com/auth/calendar.events' 
      : 'https://www.googleapis.com/auth/calendar.events.readonly';

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: scope,
      callback: async (resp: any) => {
        if (resp.error !== undefined) {
          console.error("Auth Error:", resp);
          showToast("Gagal login ke Google. Pastikan Anda mengizinkan akses.", "error");
          return;
        }
        setIsAuthenticated(true);
        showToast("Berhasil terhubung ke Google Calendar!", "success");
        await fetchEvents();
      },
    });
    setTokenClient(client);
  };

  // 4. Fetch Events (Monthly)
  const fetchEvents = async () => {
    if (!selectedRoom?.googleCalendarUrl) return;
    if (!isGapiInitialized) return;
    
    const calendarId = getCalendarId(selectedRoom.googleCalendarUrl);
    if (!calendarId) {
      // showToast("ID Kalender tidak valid.", "error"); // Suppress initial error
      return;
    }

    setIsLoading(true);
    try {
      // Calculate start and end of the displayed month
      const timeMin = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const timeMax = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const request = {
        'calendarId': calendarId,
        'timeMin': timeMin,
        'timeMax': timeMax,
        'showDeleted': false,
        'singleEvents': true,
        'orderBy': 'startTime',
      };
      const response = await window.gapi.client.calendar.events.list(request);
      setEvents(response.result.items);
    } catch (err: any) {
      console.error("Error fetching events", err);
      const errorCode = err.result?.error?.code;
      if (errorCode === 404) {
         showToast("Kalender tidak ditemukan (404). Periksa ID Kalender.", "error");
      } else if (errorCode === 403) {
         showToast("Akses ditolak (403). Pastikan API Key valid & Kalender Publik.", "error");
      } else {
         showToast(`Gagal mengambil jadwal: ${err.result?.error?.message || 'Cek Console'}`, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 5. Handle Add Event Modal
  const handleOpenAddEventModal = () => {
    if (!isAuthenticated) {
        handleAuthClick(); // Trigger login jika belum auth (untuk write)
        return;
    }
    // Reset form
    setEventForm({
        summary: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '10:00',
        recurrence: 'NONE',
        recurrenceEnd: ''
    });
    setIsAddEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom?.googleCalendarUrl) return;
    
    const calendarId = getCalendarId(selectedRoom.googleCalendarUrl);
    if (!calendarId) {
        showToast("ID Kalender tidak valid.", "error");
        return;
    }

    setIsCreatingEvent(true);
    try {
      const startDateTime = new Date(`${eventForm.startDate}T${eventForm.startTime}:00`);
      const endDateTime = new Date(`${eventForm.startDate}T${eventForm.endTime}:00`);

      // Validasi Waktu
      if (endDateTime <= startDateTime) {
          showToast("Waktu selesai harus lebih besar dari waktu mulai.", "warning");
          setIsCreatingEvent(false);
          return;
      }

      const eventResource: any = {
        'summary': eventForm.summary,
        'location': selectedRoom.name,
        'description': eventForm.description + `\n\nDibuat oleh Admin (${role}) via Silab FTI`,
        'start': {
          'dateTime': startDateTime.toISOString(),
          'timeZone': 'Asia/Jakarta'
        },
        'end': {
          'dateTime': endDateTime.toISOString(),
          'timeZone': 'Asia/Jakarta'
        },
      };

      if (eventForm.recurrence !== 'NONE') {
          let rrule = `RRULE:FREQ=${eventForm.recurrence}`;
          if (eventForm.recurrenceEnd) {
              // Format UNTIL to YYYYMMDDTHHMMSSZ (UTC)
              const untilDate = new Date(eventForm.recurrenceEnd);
              untilDate.setHours(23, 59, 59);
              const untilStr = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
              rrule += `;UNTIL=${untilStr}`;
          }
          eventResource.recurrence = [rrule];
      }

      await window.gapi.client.calendar.events.insert({
        'calendarId': calendarId,
        'resource': eventResource,
      });

      showToast("Event berhasil ditambahkan!", "success");
      setIsAddEventModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      console.error("Error creating event", err);
      showToast(`Gagal membuat jadwal: ${err.result?.error?.message || err.message}`, "error");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Trigger fetch when room changes (Public Access)
  useEffect(() => {
    if (isGapiInitialized) {
      fetchEvents();
    }
  }, [filterRoom, isGapiInitialized, currentDate]);

  const handleAuthClick = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const formatEventTime = (dateTime?: string, date?: string) => {
    if (dateTime) {
      return new Date(dateTime).toLocaleString('id-ID', { 
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
      });
    }
    if (date) {
      return new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) + " (Seharian)";
    }
    return "-";
  };

  // Calendar Grid Logic
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday
    
    // Adjust for Monday start if needed (currently Sunday start)
    
    const days: { date: number; events: GoogleEvent[]; isCurrentMonth: boolean; fullDate: string }[] = [];

    // Padding days from previous month
    for (let i = 0; i < startingDay; i++) {
        days.push({ date: 0, events: [], isCurrentMonth: false, fullDate: '' });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        days.push({ 
            date: i, 
            events: [], 
            isCurrentMonth: true,
            fullDate: dateStr
        });
    }

    // Map events to days
    events.forEach(event => {
      const dateKey = event.start.date || (event.start.dateTime ? event.start.dateTime.split('T')[0] : 'Unknown');
      const dayObj = days.find(d => d.fullDate === dateKey);
      if (dayObj) {
          dayObj.events.push(event);
      }
    });

    return days;
  }, [currentDate, events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal Laboratorium</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Jadwal Resmi Ruangan: <span className="font-bold text-blue-600 dark:text-blue-400">
              {selectedRoom?.name || 'Pilih Ruangan'}
            </span>
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <div className="flex items-center gap-2 w-full md:w-72">
                 <Filter className="w-4 h-4 text-gray-400" />
                 <select 
                    value={filterRoom}
                    onChange={(e) => setFilterRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                 >
                    {MOCK_ROOMS.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                 </select>
             </div>
             {role === Role.ADMIN && (
                <button 
                  onClick={handleOpenAddEventModal}
                  disabled={isLoading}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
                >
                   <Plus className="w-4 h-4 mr-2" />
                   Tambah Jadwal
                </button>
             )}
             {isGapiInitialized && (
                <button 
                  onClick={() => fetchEvents()} 
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Refresh Jadwal"
                >
                   <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
             )}
         </div>
         
         {selectedRoom?.googleCalendarUrl && (
             <a 
                href={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(getCalendarId(selectedRoom.googleCalendarUrl) || '')}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center"
             >
                 Buka di Tab Baru <ExternalLink className="w-4 h-4 ml-1" />
             </a>
         )}
      </div>

      {/* Calendar Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 animate-fade-in-up">
               {/* Calendar Header */}
               <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                   <div className="flex items-center gap-4">
                       <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center capitalize">
                          {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                          {isLoading && <Loader2 className="w-4 h-4 ml-3 animate-spin text-blue-500"/>}
                       </h3>
                       <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                           <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                           <button onClick={goToToday} className="px-2 text-xs font-medium hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors">Hari Ini</button>
                           <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"><ChevronRight className="w-4 h-4"/></button>
                       </div>
                   </div>
                   <div className="text-sm text-gray-500 dark:text-gray-400">
                      Total: {events.length} Kegiatan
                   </div>
               </div>
               
               {/* Calendar Grid */}
               <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                   {/* Days Header */}
                   <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                       {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                           <div key={day} className="py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                               {day}
                           </div>
                       ))}
                   </div>
                   
                   {/* Days Grid */}
                   <div className="grid grid-cols-7 auto-rows-fr bg-white dark:bg-gray-800">
                       {calendarGrid.map((day, idx) => (
                           <div 
                               key={idx} 
                               className={`min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700 p-2 transition-colors ${!day.isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                           >
                               {day.isCurrentMonth && (
                                   <>
                                       <div className={`text-sm font-medium mb-2 ${
                                           day.fullDate === new Date().toISOString().split('T')[0] 
                                           ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full' 
                                           : 'text-gray-700 dark:text-gray-300'
                                       }`}>
                                           {day.date}
                                       </div>
                                       <div className="space-y-1">
                                           {day.events.map(event => (
                                               <a 
                                                   key={event.id}
                                                   href={event.htmlLink}
                                                   target="_blank"
                                                   rel="noopener noreferrer"
                                                   className="block text-xs p-1.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 truncate hover:opacity-80 transition-opacity"
                                                   title={`${event.summary}\n${formatEventTime(event.start.dateTime, event.start.date)}`}
                                               >
                                                   {event.start.dateTime && <span className="font-mono text-[10px] mr-1 opacity-75">{new Date(event.start.dateTime).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>}
                                                   {event.summary}
                                               </a>
                                           ))}
                                       </div>
                                   </>
                               )}
                           </div>
                       ))}
                   </div>
               </div>
            </div>
      </div>

      {/* Add Event Modal */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Tambah Jadwal Baru
                 </h3>
                 <button onClick={() => setIsAddEventModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul Kegiatan</label>
                    <div className="relative">
                        <Type className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" required 
                            value={eventForm.summary} 
                            onChange={e => setEventForm({...eventForm, summary: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Contoh: Praktikum Jarkom A"
                        />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                    <div className="relative">
                        <AlignLeft className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <textarea 
                            rows={3}
                            value={eventForm.description} 
                            onChange={e => setEventForm({...eventForm, description: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Tambahkan detail kegiatan..."
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal</label>
                        <input 
                            type="date" required 
                            value={eventForm.startDate} 
                            onChange={e => setEventForm({...eventForm, startDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Mulai</label>
                        <input 
                            type="time" required 
                            value={eventForm.startTime} 
                            onChange={e => setEventForm({...eventForm, startTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                        <input 
                            type="time" required 
                            value={eventForm.endTime} 
                            onChange={e => setEventForm({...eventForm, endTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pengulangan (Repeat)</label>
                    <div className="flex gap-4">
                        <select 
                            value={eventForm.recurrence}
                            onChange={e => setEventForm({...eventForm, recurrence: e.target.value})}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="NONE">Tidak Berulang</option>
                            <option value="DAILY">Harian (Daily)</option>
                            <option value="WEEKLY">Mingguan (Weekly)</option>
                            <option value="MONTHLY">Bulanan (Monthly)</option>
                        </select>
                        {eventForm.recurrence !== 'NONE' && (
                            <input 
                                type="date" 
                                title="Berakhir Pada (Opsional)"
                                value={eventForm.recurrenceEnd} 
                                onChange={e => setEventForm({...eventForm, recurrenceEnd: e.target.value})}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        )}
                    </div>
                 </div>

                 <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <button type="button" onClick={() => setIsAddEventModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                       Batal
                    </button>
                    <button type="submit" disabled={isCreatingEvent} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                       {isCreatingEvent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan Jadwal
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;