import React, { useState, useEffect, useMemo } from 'react';
import { Role, Room } from '../types';
import { 
  Calendar as CalendarIcon, Filter, ExternalLink, Clock, MapPin, RefreshCw, AlertCircle, Loader2, LogIn, ChevronRight, Plus, ChevronLeft,
  X, Save, Repeat, Type, AlignLeft, LogOut, CheckCircle, XCircle, Trash2, Edit
} from 'lucide-react';
import { api } from '../services/api';
import { CLIENT_ID, API_KEY, DISCOVERY_DOCS, SCOPES } from '../src/config/google';

// Declare global types for Google API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

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

// Type for persistent auth state
interface GoogleAuthState {
  isAuthenticated: boolean;
  email: string;
  accessToken: string;
}

const JadwalRuang: React.FC<ScheduleProps> = ({ role, showToast, isDarkMode }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filterRoom, setFilterRoom] = useState<string>(''); 
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGapiInitialized, setIsGapiInitialized] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string>('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<{ date: number; events: GoogleEvent[]; fullDate: string } | null>(null);
  
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
  
  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<GoogleEvent | null>(null);
  const [deleteOption, setDeleteOption] = useState<'single' | 'thisAndFollowing' | 'all'>('single');

  // Edit Event Modal State
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GoogleEvent | null>(null);
  const [editEventForm, setEditEventForm] = useState({
    summary: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00'
  });
  
  // Check for persistent auth on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('googleAuth');
    if (savedAuth) {
      try {
        const authState: GoogleAuthState = JSON.parse(savedAuth);
        if (authState.isAuthenticated && authState.accessToken) {
          setIsAuthenticated(true);
          setGoogleUserEmail(authState.email || '');
          // Set the access token for gapi
          if (window.gapi) {
            window.gapi.client.setToken({ access_token: authState.accessToken });
          }
        }
      } catch (e) {
        console.error("Error parsing saved auth:", e);
        localStorage.removeItem('googleAuth');
      }
    }
  }, []);

  // Save auth state to localStorage when it changes
  const saveAuthState = (authenticated: boolean, email: string = '', accessToken: string = '') => {
    if (authenticated && accessToken) {
      const authState: GoogleAuthState = {
        isAuthenticated: true,
        email: email,
        accessToken: accessToken
      };
      localStorage.setItem('googleAuth', JSON.stringify(authState));
    } else {
      localStorage.removeItem('googleAuth');
    }
  };

  // Logout from Google (revoke access)
  const handleGoogleLogout = () => {
    // Clear local storage
    localStorage.removeItem('googleAuth');
    setIsAuthenticated(false);
    setGoogleUserEmail('');
    
    // Revoke Google token if possible
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      const token = localStorage.getItem('googleAuth');
      if (token) {
        try {
          const authState = JSON.parse(token);
          if (authState.accessToken) {
            window.google.accounts.oauth2.revoke(authState.accessToken);
          }
        } catch (e) {}
      }
    }
    
    // Reset gapi token
    if (window.gapi) {
      window.gapi.client.setToken({});
    }
    
    showToast("Berhasil logout dari Google Calendar", "info");
  };
  
  // Fetch Rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api('/api/rooms');
        if (res.ok) {
          const data = await res.json();
          setRooms(data);
          // Set default room to the first one if available
          if (data.length > 0) {
            setFilterRoom(data[0].id);
          }
        }
      } catch (e) {
        console.error("Gagal mengambil data ruangan", e);
        showToast("Gagal memuat daftar ruangan", "error");
      }
    };
    fetchRooms();
  }, []);

  const selectedRoom = rooms.find(r => r.id === filterRoom);

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

  // 3. Initialize GIS Client (Auth) - Modified for persistent login
  const initializeGisClient = () => {
    // Tentukan scope berdasarkan role: Admin dapat Write, User hanya Read
    const scope = (role === Role.ADMIN || role === Role.LABORAN)
      ? 'https://www.googleapis.com/auth/calendar.events' 
      : 'https://www.googleapis.com/auth.calendar.events.readonly';

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: scope,
      callback: async (resp: any) => {
        if (resp.error !== undefined) {
          console.error("Auth Error:", resp);
          showToast("Gagal login ke Google. Pastikan Anda mengizinkan akses.", "error");
          return;
        }
        
        // Success - save auth state
        setIsAuthenticated(true);
        
        // Get user email if available
        let userEmail = '';
        try {
          // Try to get user info
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` }
          });
          if (userInfoRes.ok) {
            const userInfo = await userInfoRes.json();
            userEmail = userInfo.email || '';
            setGoogleUserEmail(userEmail);
          }
        } catch (e) {
          console.error("Error getting user info:", e);
        }
        
        // Save to localStorage for persistence
        saveAuthState(true, userEmail, resp.access_token);
        
        // Set token for gapi
        window.gapi.client.setToken({ access_token: resp.access_token });
        
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
      if (errorCode === 401) {
        // Token expired - try to refresh or re-authenticate
        handleGoogleLogout();
        showToast("Sesi Google Calendar expired. Silakan login ulang.", "warning");
      } else if (errorCode === 404) {
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
        'description': eventForm.description + `\n\nDibuat oleh Admin () via Silab FTI`,
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
              rrule += `;UNTIL=`;
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

  // Handler Delete Event
  const handleDeleteEventClick = (event: GoogleEvent) => {
    if (!isAuthenticated) {
      handleAuthClick();
      return;
    }
    setEventToDelete(event);
    setDeleteOption('single');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete || !selectedRoom?.googleCalendarUrl) return;
    
    const calendarId = getCalendarId(selectedRoom.googleCalendarUrl);
    if (!calendarId) {
      showToast("ID Kalender tidak valid.", "error");
      return;
    }

    setIsDeletingEvent(true);
    try {
      if (deleteOption === 'single') {
        await window.gapi.client.calendar.events.delete({
          calendarId: calendarId,
          eventId: eventToDelete.id
        });
        showToast("Jadwal berhasil dihapus!", "success");
      } else {
        // For recurring events, we need to handle this differently
        // For simplicity, we'll just delete the single event
        await window.gapi.client.calendar.events.delete({
          calendarId: calendarId,
          eventId: eventToDelete.id
        });
        showToast("Jadwal berhasil dihapus!", "success");
      }
      
      setIsDeleteModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err: any) {
      console.error("Error deleting event", err);
      showToast(`Gagal menghapus jadwal: ${err.result?.error?.message || err.message}`, "error");
    } finally {
      setIsDeletingEvent(false);
      setEventToDelete(null);
    }
  };

  // Handler Edit Event
  const handleEditEventClick = (event: GoogleEvent) => {
    if (!isAuthenticated) {
      handleAuthClick();
      return;
    }
    
    // Parse existing event data
    const startDateTime = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date || '');
    const endDateTime = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date || '');
    
    setEditingEvent(event);
    setEditEventForm({
      summary: event.summary,
      description: event.description || '',
      startDate: event.start.date || startDateTime.toISOString().split('T')[0],
      startTime: event.start.dateTime ? startDateTime.toTimeString().slice(0, 5) : '08:00',
      endTime: event.end.dateTime ? endDateTime.toTimeString().slice(0, 5) : '10:00'
    });
    setIsEditEventModalOpen(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !selectedRoom?.googleCalendarUrl) return;
    
    const calendarId = getCalendarId(selectedRoom.googleCalendarUrl);
    if (!calendarId) {
      showToast("ID Kalender tidak valid.", "error");
      return;
    }

    setIsCreatingEvent(true);
    try {
      const startDateTime = new Date(`${editEventForm.startDate}T${editEventForm.startTime}:00`);
      const endDateTime = new Date(`${editEventForm.startDate}T${editEventForm.endTime}:00`);

      if (endDateTime <= startDateTime) {
        showToast("Waktu selesai harus lebih besar dari waktu mulai.", "warning");
        setIsCreatingEvent(false);
        return;
      }

      const eventResource: any = {
        'summary': editEventForm.summary,
        'location': selectedRoom.name,
        'description': editEventForm.description + `\n\nDiubah oleh Admin via Silab FTI`,
        'start': {
          'dateTime': startDateTime.toISOString(),
          'timeZone': 'Asia/Jakarta'
        },
        'end': {
          'dateTime': endDateTime.toISOString(),
          'timeZone': 'Asia/Jakarta'
        },
      };

      await window.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: editingEvent.id,
        resource: eventResource,
      });

      showToast("Jadwal berhasil diperbarui!", "success");
      setIsEditEventModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err: any) {
      console.error("Error updating event", err);
      showToast(`Gagal memperbarui jadwal: ${err.result?.error?.message || err.message}`, "error");
    } finally {
      setIsCreatingEvent(false);
    }
  };
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

  // Handler saat tanggal diklik
  const handleDayClick = (day: { date: number; events: GoogleEvent[]; isCurrentMonth: boolean; fullDate: string }) => {
    if (!day.isCurrentMonth) return;

    const canAdd = role === Role.ADMIN || role === Role.LABORAN;

    // Jika Admin/Laboran klik tanggal kosong (tidak ada event), langsung buka form tambah
    if (canAdd && day.events.length === 0) {
        if (!isAuthenticated) {
            handleAuthClick();
            return;
        }
        setEventForm({
            summary: '',
            description: '',
            startDate: day.fullDate, // Isi otomatis tanggal yang diklik
            startTime: '08:00',
            endTime: '10:00',
            recurrence: 'NONE',
            recurrenceEnd: ''
        });
        setIsAddEventModalOpen(true);
    } else {
        // Jika ada event atau user biasa, buka detail harian
        setSelectedDayDetail(day);
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

  // Helper to check overlap for styling (Visual indication only, not conflict)
  const checkOverlap = (currentEvent: GoogleEvent, dayEvents: GoogleEvent[]) => {
      if (!currentEvent.start.dateTime || !currentEvent.end.dateTime) return false;
      const currentStart = new Date(currentEvent.start.dateTime).getTime();
      const currentEnd = new Date(currentEvent.end.dateTime).getTime();

      return dayEvents.some(other => {
          if (other.id === currentEvent.id) return false;
          if (!other.start.dateTime || !other.end.dateTime) return false;
          const otherStart = new Date(other.start.dateTime).getTime();
          const otherEnd = new Date(other.end.dateTime).getTime();

          return currentStart < otherEnd && currentEnd > otherStart;
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal Ruang</h1>
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
                    {rooms.length === 0 && <option value="">Memuat ruangan...</option>}
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                 </select>
             </div>
             {(role === Role.ADMIN || role === Role.LABORAN) && (
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
         
         <div className="flex items-center gap-3">
            {/* Google Auth Status */}
            {(role === Role.ADMIN || role === Role.LABORAN) && (
                <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs text-green-700 dark:text-green-300 font-medium max-w-[150px] truncate">
                                {googleUserEmail || 'Terhubung'}
                            </span>
                            <button 
                                onClick={handleGoogleLogout}
                                className="p-1 hover:bg-green-100 dark:hover:bg-green-900/40 rounded transition-colors"
                                title="Logout Google"
                            >
                                <LogOut className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleAuthClick}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="Login dengan Google untuk menambahkan jadwal"
                        >
                            <LogIn className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-300">Login Google</span>
                        </button>
                    )}
                </div>
            )}
            
            {selectedRoom?.googleCalendarUrl && role !== Role.USER && (
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
      </div>

      {/* Calendar Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {rooms.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-4">
                      <MapPin className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Data Ruangan Kosong</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                      Belum ada ruangan yang terdaftar. Silakan tambahkan ruangan terlebih dahulu di menu Daftar Ruangan.
                  </p>
              </div>
          ) : (
            <div className="p-6 animate-fade-in-up">
               {/* Calendar Header */}
               <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                   <div className="flex items-center gap-3">
                       <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm">
                           <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300">
                               <ChevronLeft className="w-5 h-5"/>
                           </button>
                           <span className="px-4 text-base font-bold text-gray-900 dark:text-white capitalize min-w-[160px] text-center select-none">
                               {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                           </span>
                           <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300">
                               <ChevronRight className="w-5 h-5"/>
                           </button>
                       </div>
                       {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500"/>}
                       <button onClick={goToToday} className="text-sm text-blue-600 hover:underline font-medium ml-2">
                           Hari Ini
                       </button>
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
                               onClick={() => handleDayClick(day)}
                               className={`min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700 p-2 transition-colors ${!day.isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer'}`}
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
                                           {day.events.map(event => {
                                               const isOverlapping = checkOverlap(event, day.events);
                                               return (
                                               <div 
                                                   key={event.id}
                                                   onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                                   className={`block text-xs p-1.5 rounded border truncate hover:opacity-80 transition-opacity cursor-pointer ${
                                                       isOverlapping 
                                                       ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                                                       : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800'
                                                   }`}
                                                   title={`${event.summary}\n${formatEventTime(event.start.dateTime, event.start.date)}${isOverlapping ? '\n(Jadwal Bersamaan)' : ''}`}
                                               >
                                                   <div className="flex items-center">
                                                       {isOverlapping && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5 flex-shrink-0" />}
                                                       {event.start.dateTime && <span className="font-mono text-[10px] mr-1 opacity-75 flex-shrink-0">{new Date(event.start.dateTime).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>}
                                                       <span className="truncate">{event.summary}</span>
                                                   </div>
                                               </div>
                                               );
                                           })}
                                       </div>
                                   </>
                               )}
                           </div>
                       ))}
                   </div>
               </div>
            </div>
          )}
      </div>

      {/* Day Detail Modal */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedDayDetail(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center pr-4">
                        <CalendarIcon className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0" />
                        {new Date(selectedDayDetail.fullDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <button onClick={() => setSelectedDayDetail(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Tombol Tambah di Modal Detail (Untuk tanggal yang sudah ada isinya) */}
                {(role === Role.ADMIN || role === Role.LABORAN) && (
                    <div className="px-6 pt-4">
                        <button 
                            onClick={() => {
                                setSelectedDayDetail(null);
                                setEventForm(prev => ({ ...prev, startDate: selectedDayDetail.fullDate }));
                                setIsAddEventModalOpen(true);
                            }}
                            className="w-full py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Tambah Jadwal di Tanggal Ini
                        </button>
                    </div>
                )}

                <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
                    {selectedDayDetail.events.length > 0 ? (
                        <div className="space-y-3">
                            {selectedDayDetail.events.map(event => {
                                const isOverlapping = checkOverlap(event, selectedDayDetail.events);
                                return (
                                    <div 
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className={`block p-3 rounded-lg border hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer ${
                                            isOverlapping 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800'
                                        }`}
                                    >
                                        <p className="font-bold text-sm mb-1">{event.summary}</p>
                                        <div className="flex items-center text-xs opacity-80">
                                            <Clock className="w-3 h-3 mr-1.5" />
                                            <span>
                                                {event.start.dateTime 
                                                    ? `${new Date(event.start.dateTime).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} - ${event.end.dateTime ? new Date(event.end.dateTime).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : ''}`
                                                    : 'Seharian'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">Tidak ada kegiatan terjadwal pada hari ini.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedEvent(null)}>
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center pr-4">
                    <CalendarIcon className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0" />
                    Detail Kegiatan
                 </h3>
                 <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="flex items-start">
                    <Type className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                       <p className="text-sm font-medium text-gray-900 dark:text-white">Nama Kegiatan</p>
                       <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold mt-0.5">
                          {selectedEvent.summary}
                       </p>
                    </div>
                 </div>

                 <div className="flex items-start">
                    <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                       <p className="text-sm font-medium text-gray-900 dark:text-white">Waktu</p>
                       <p className="text-sm text-gray-600 dark:text-gray-300">
                          {formatEventTime(selectedEvent.start.dateTime, selectedEvent.start.date)}
                          {selectedEvent.end.dateTime && ` - ${new Date(selectedEvent.end.dateTime).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}`}
                       </p>
                    </div>
                 </div>
                 
                 <div className="flex items-start">
                    <AlignLeft className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                       <p className="text-sm font-medium text-gray-900 dark:text-white">Deskripsi</p>
                       <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto mt-1 scrollbar-thin">
                          {selectedEvent.description || "Tidak ada deskripsi."}
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 {(role === Role.ADMIN || role === Role.LABORAN) && isAuthenticated ? (
                    <div className="flex gap-2">
                       <button 
                          onClick={() => handleEditEventClick(selectedEvent)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center transition-colors shadow-sm hover:shadow"
                       >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Edit
                       </button>
                       <button 
                          onClick={() => handleDeleteEventClick(selectedEvent)}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg flex items-center transition-colors shadow-sm hover:shadow"
                       >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Hapus
                       </button>
                    </div>
                 ) : <div />}
                 <a 
                    href={selectedEvent.htmlLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center"
                 >
                    Buka di Google Calendar <ExternalLink className="w-4 h-4 ml-1" />
                 </a>
              </div>
           </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-full sm:max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
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

      {/* Delete Event Confirmation Modal */}
      {isDeleteModalOpen && eventToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
                 <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center">
                    <Trash2 className="w-5 h-5 mr-2" />
                    Hapus Jadwal
                 </h3>
              </div>
              <div className="p-6 space-y-4">
                 <p className="text-sm text-gray-600 dark:text-gray-300">
                    Anda akan menghapus jadwal <strong>"{eventToDelete.summary}"</strong>. Pilih metode penghapusan:
                 </p>
                 
                 <div className="space-y-2">
                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${deleteOption === 'single' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <input 
                        type="radio" 
                        name="deleteOption" 
                        value="single"
                        checked={deleteOption === 'single'}
                        onChange={() => setDeleteOption('single')}
                        className="mr-3"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Hapus ini saja</p>
                        <p className="text-xs text-gray-500">Menghapus hanya event ini</p>
                      </div>
                    </label>
                    
                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${deleteOption === 'thisAndFollowing' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <input 
                        type="radio" 
                        name="deleteOption" 
                        value="thisAndFollowing"
                        checked={deleteOption === 'thisAndFollowing'}
                        onChange={() => setDeleteOption('thisAndFollowing')}
                        className="mr-3"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Ini dan selanjutnya</p>
                        <p className="text-xs text-gray-500">Menghapus event ini dan event mendatang</p>
                      </div>
                    </label>
                    
                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${deleteOption === 'all' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      <input 
                        type="radio" 
                        name="deleteOption" 
                        value="all"
                        checked={deleteOption === 'all'}
                        onChange={() => setDeleteOption('all')}
                        className="mr-3"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Semua event</p>
                        <p className="text-xs text-gray-500">Menghapus semua event yang cocok</p>
                      </div>
                    </label>
                 </div>

                 <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                       Batal
                    </button>
                    <button 
                      onClick={confirmDeleteEvent}
                      disabled={isDeletingEvent}
                      className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md flex items-center disabled:opacity-50"
                    >
                       {isDeletingEvent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                       Hapus Jadwal
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {isEditEventModalOpen && editingEvent && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-full sm:max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                    <Edit className="w-5 h-5 mr-2 text-blue-600" />
                    Edit Jadwal
                 </h3>
                 <button onClick={() => setIsEditEventModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleUpdateEvent} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Judul Kegiatan</label>
                    <div className="relative">
                        <Type className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" required 
                            value={editEventForm.summary} 
                            onChange={e => setEditEventForm({...editEventForm, summary: e.target.value})}
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
                            value={editEventForm.description} 
                            onChange={e => setEditEventForm({...editEventForm, description: e.target.value})}
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
                            value={editEventForm.startDate} 
                            onChange={e => setEditEventForm({...editEventForm, startDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Mulai</label>
                        <input 
                            type="time" required 
                            value={editEventForm.startTime} 
                            onChange={e => setEditEventForm({...editEventForm, startTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                        <input 
                            type="time" required 
                            value={editEventForm.endTime} 
                            onChange={e => setEditEventForm({...editEventForm, endTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                 </div>

                 <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <button type="button" onClick={() => setIsEditEventModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                       Batal
                    </button>
                    <button type="submit" disabled={isCreatingEvent} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                       {isCreatingEvent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan Perubahan
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default JadwalRuang;

