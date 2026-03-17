import React, { useState, useEffect, useMemo } from 'react';
import { Role, Room } from '../types';
import { 
  Calendar as CalendarIcon, Filter, ExternalLink, MapPin, Plus,
  RefreshCw, LogIn, LogOut, CheckCircle, Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { CLIENT_ID, API_KEY, DISCOVERY_DOCS, SCOPES } from '../src/config/google';
import RoomCalendar from '../components/RoomCalendar';

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

interface EventForm {
  summary: string;
  description: string;
  startDate: string;
  startTime: string;
  endTime: string;
  recurrence: string;
  recurrenceEnd: string;
}

interface EditEventForm {
  summary: string;
  description: string;
  startDate: string;
  startTime: string;
  endTime: string;
}

interface DayDetail {
  date: number;
  events: GoogleEvent[];
  fullDate: string;
}

const JadwalRuang: React.FC<ScheduleProps> = ({ role, showToast, isDarkMode }) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
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
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayDetail | null>(null);
  
  // Form State for Add Event
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>({
    summary: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00',
    recurrence: 'NONE',
    recurrenceEnd: ''
  });
  
  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<GoogleEvent | null>(null);
  const [deleteOption, setDeleteOption] = useState<'single' | 'thisAndFollowing' | 'all'>('single');

  // Edit Event Modal State
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GoogleEvent | null>(null);
  const [editEventForm, setEditEventForm] = useState<EditEventForm>({
    summary: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00'
  });

  const selectedRoom = rooms.find(r => r.id === filterRoom);

  // Check for persistent auth on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('googleAuth');
    if (savedAuth) {
      try {
        const authState: GoogleAuthState = JSON.parse(savedAuth);
        if (authState.isAuthenticated && authState.accessToken) {
          setIsAuthenticated(true);
          setGoogleUserEmail(authState.email || '');
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
    localStorage.removeItem('googleAuth');
    setIsAuthenticated(false);
    setGoogleUserEmail('');
    
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
    
    if (window.gapi) {
      window.gapi.client.setToken({});
    }
    
    showToast("Berhasil logout dari Google Calendar", "info");
  };
  
  // Fetch Rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api('/api/rooms?exclude_image=true');
        if (res.ok) {
          const data = await res.json();
          setRooms(data);
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

  // Fetch Events (based on view)
  const fetchEvents = async () => {
    if (!selectedRoom?.googleCalendarUrl || !isGapiInitialized) return;
    
    const calendarId = getCalendarId(selectedRoom.googleCalendarUrl);
    if (!calendarId) return;

    setIsLoading(true);
    try {
      const { timeMin, timeMax } = getDateRangeForView(currentDate, viewMode);

      const request = {
        'calendarId': calendarId,
        'timeMin': timeMin.toISOString(),
        'timeMax': timeMax.toISOString(),
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

  // Load Google API Scripts
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

  // Initialize GAPI Client
  const initializeGapiClient = async () => {
    try {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      setIsGapiInitialized(true);
    } catch (error: any) {
      console.error("Gagal inisialisasi GAPI:", error.result || error);
      
      // More detailed error detection
      let friendlyMessage = "Gagal memuat Google API. Cek konsol untuk detail.";
      
      const gapiError = error.result?.error;
      const errorMessage = gapiError?.message || '';
      const errorStatus = gapiError?.status || '';
      
      if (errorStatus === 'PERMISSION_DENIED' || errorStatus === 'RESOURCE_PROJECT_INVALID') {
        if (errorMessage.includes('API has not been used') || errorMessage.includes('not enabled')) {
          friendlyMessage = "Google Calendar API belum diaktifkan. Hubungi admin untuk mengaktifkan Google Calendar API di Google Cloud Console.";
        } else if (errorMessage.includes('referer')) {
          friendlyMessage = "API Key dibatasi oleh HTTP Referrer. Pastikan domain Anda sudah terdaftar di Google Cloud Console.";
        } else if (errorMessage.includes('key')) {
          friendlyMessage = "API Key tidak valid atau telah kedaluwarsa. Hubungi admin untuk memperbarui Google API Key.";
        } else {
          friendlyMessage = `Akses ditolak (403). Pastikan Google Calendar API sudah diaktifkan dan API Key tidak memiliki pembatasan yang ketat. Detail: ${errorMessage}`;
        }
      } else if (errorStatus === 'FORBIDDEN') {
        friendlyMessage = "Akses Forbidden (403). Periksa konfigurasi API Key di Google Cloud Console.";
      }
      
      showToast(friendlyMessage, "error");
      setIsGapiInitialized(false);
    }
  };

  // Initialize GIS Client (Auth)
  const initializeGisClient = () => {
    // Gunakan scope dari config yang sudah mencakup email & profile
    const scope = (role === Role.ADMIN || role === Role.LABORAN) 
      ? SCOPES.READWRITE 
      : SCOPES.READONLY;

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
        
        let userEmail = '';
        try {
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
        
        saveAuthState(true, userEmail, resp.access_token);
        window.gapi.client.setToken({ access_token: resp.access_token });
        
        showToast("Berhasil terhubung ke Google Calendar!", "success");
        await fetchEvents();
      },
    });
    setTokenClient(client);
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  // Date range helper
  const getDateRangeForView = (date: Date, view: 'month' | 'week' | 'day') => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    let timeMin, timeMax;

    if (view === 'month') {
      timeMin = new Date(year, month, 1);
      timeMax = new Date(year, month + 1, 0, 23, 59, 59);
    } else if (view === 'week') {
      timeMin = new Date(date);
      timeMin.setDate(day - date.getDay());
      timeMin.setHours(0, 0, 0, 0);
      timeMax = new Date(timeMin);
      timeMax.setDate(timeMin.getDate() + 6);
      timeMax.setHours(23, 59, 59, 999);
    } else {
      timeMin = new Date(year, month, day, 0, 0, 0);
      timeMax = new Date(year, month, day, 23, 59, 59);
    }
    return { timeMin, timeMax };
  };

  // Handle Add Event Modal
  const handleOpenAddEventModal = () => {
    if (!isAuthenticated) {
        handleAuthClick();
        return;
    }
    
    let defaultDate: string;
    if (viewMode === 'day') {
      defaultDate = currentDate.toISOString().split('T')[0];
    } else {
      defaultDate = new Date().toISOString().split('T')[0];
    }
    
    setEventForm({
        summary: '',
        description: '',
        startDate: defaultDate,
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

      if (endDateTime <= startDateTime) {
          showToast("Waktu selesai harus lebih besar dari waktu mulai.", "warning");
          setIsCreatingEvent(false);
          return;
      }

      const eventResource: any = {
        'summary': eventForm.summary,
        'location': selectedRoom.name,
        'description': eventForm.description + `\n\nDibuat oleh Admin () via CORE.FTI`,
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
              const untilDate = new Date(eventForm.recurrenceEnd);
              untilDate.setHours(23, 59, 59);
              const untilStr = untilDate.toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';
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
      await window.gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventToDelete.id
      });
      showToast("Jadwal berhasil dihapus!", "success");
      
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
        'description': editEventForm.description + `\n\nDiubah oleh Admin via CORE.FTI`,
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

  // Fetch events when dependencies change
  useEffect(() => {
    if (isGapiInitialized) {
      const handler = setTimeout(() => {
        fetchEvents();
      }, 200);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [filterRoom, isGapiInitialized, currentDate, viewMode]);

  const handleAuthClick = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  // Handler saat tanggal diklik
  const handleDayClick = (day: { date: number; events: GoogleEvent[]; isCurrentMonth: boolean; fullDate: string }) => {
    if (!day.isCurrentMonth) return;

    const canAdd = role === Role.ADMIN || role === Role.LABORAN;

    if (canAdd && day.events.length === 0) {
        if (!isAuthenticated) {
            handleAuthClick();
            return;
        }
        setEventForm({
            summary: '',
            description: '',
            startDate: day.fullDate,
            startTime: '08:00',
            endTime: '10:00',
            recurrence: 'NONE',
            recurrenceEnd: ''
        });
        setIsAddEventModalOpen(true);
    } else {
        setSelectedDayDetail(day);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section - Room Selection */}
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

      {/* Room Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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

      {/* RoomCalendar Component - handles all calendar rendering and modals */}
      <RoomCalendar
        events={events}
        rooms={rooms}
        selectedRoom={selectedRoom}
        viewMode={viewMode}
        currentDate={currentDate}
        isAuthenticated={isAuthenticated}
        googleUserEmail={googleUserEmail}
        role={role}
        isAddEventModalOpen={isAddEventModalOpen}
        isEditEventModalOpen={isEditEventModalOpen}
        isDeleteModalOpen={isDeleteModalOpen}
        selectedEvent={selectedEvent}
        selectedDayDetail={selectedDayDetail}
        eventForm={eventForm}
        editEventForm={editEventForm}
        eventToDelete={eventToDelete}
        deleteOption={deleteOption}
        isCreatingEvent={isCreatingEvent}
        isDeletingEvent={isDeletingEvent}
        isLoading={isLoading}
        isGapiInitialized={isGapiInitialized}
        setViewMode={setViewMode}
        setCurrentDate={setCurrentDate}
        goToToday={goToToday}
        handlePrev={handlePrev}
        handleNext={handleNext}
        handleAuthClick={handleAuthClick}
        handleGoogleLogout={handleGoogleLogout}
        handleOpenAddEventModal={handleOpenAddEventModal}
        handleDayClick={handleDayClick}
        setSelectedEvent={setSelectedEvent}
        setSelectedDayDetail={setSelectedDayDetail}
        setEventForm={setEventForm}
        setEditEventForm={setEditEventForm}
        setIsAddEventModalOpen={setIsAddEventModalOpen}
        setIsEditEventModalOpen={setIsEditEventModalOpen}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        setEventToDelete={setEventToDelete}
        setDeleteOption={setDeleteOption}
        handleEditEventClick={handleEditEventClick}
        handleDeleteEventClick={handleDeleteEventClick}
        handleSaveEvent={handleSaveEvent}
        handleUpdateEvent={handleUpdateEvent}
        confirmDeleteEvent={confirmDeleteEvent}
        fetchEvents={fetchEvents}
        isDarkMode={isDarkMode}
        showToast={showToast}
      />
    </div>
  );
};

export default JadwalRuang;
