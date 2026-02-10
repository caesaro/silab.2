import React, { useState, useEffect, useRef } from 'react';
import { MOCK_ROOMS, MOCK_BOOKINGS, MOCK_LAB_STAFF } from '../services/mockData';
import { Room, Role, BookingStatus, Booking } from '../types';
import { Search, MapPin, Users, Wifi, Edit2, Trash2, Calendar, Eye, Check, Plus, Upload, Loader2, ArrowUpDown, ExternalLink, FileText, User, LogIn, RefreshCw, Clock, ChevronRight } from 'lucide-react';

// Declare Pannellum for TypeScript
declare global {
  interface Window {
    pannellum: any;
    gapi: any;
    google: any;
  }
}

// Google API Config
const CLIENT_ID = '828476305239-7hilvfjvadt8ndn9br7n1upmdso38ou8.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDMKoa430rirp8g8bBU3Xt-IE5EKZjiZWQ';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly';

interface RoomsProps {
  role: Role;
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

// Sub-component for 360 Thumbnail in List View
const Room360Thumbnail: React.FC<{ room: Room }> = ({ room }) => {
    return (
        <div className="w-full h-full relative group">
            <img 
                src={room.image} 
                alt={room.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
            
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <span className="text-white text-xs font-bold flex items-center bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                    <Eye className="w-4 h-4 mr-2"/> Lihat 360°
                 </span>
            </div>
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center z-20 pointer-events-none">
                  <MapPin className="w-3 h-3 mr-1"/> FTI Lt. 4
            </div>
        </div>
    );
};

const Rooms: React.FC<RoomsProps> = ({ role, isDarkMode }) => {
  const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'capacity'>('name');
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'booking' | 'form'>('list');
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);

  // CRUD & Form State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Room>>({});
  const [isImageProcessing, setIsImageProcessing] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Booking Form State
  const [bookingForm, setBookingForm] = useState<Partial<Booking>>({
    purpose: '', responsiblePerson: '', contactPerson: '', proposalFile: ''
  });
  const [bookingSchedules, setBookingSchedules] = useState<{date: string, startTime: string, endTime: string}[]>([
    { date: '', startTime: '', endTime: '' }
  ]);
  const [bookingFile, setBookingFile] = useState<File | null>(null);

  // Pannellum Ref
  const panoramaRef = useRef<HTMLDivElement>(null);

  // Google API State
  const [calendarEvents, setCalendarEvents] = useState<GoogleEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  // Filter Active Technicians for PIC Dropdown
  const activeTechnicians = MOCK_LAB_STAFF.filter(s => s.type === 'Teknisi' && s.status === 'Aktif');

  // Filter & Sort Logic
  const filteredRooms = rooms
    .filter(room => 
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.capacity - a.capacity;
    });

  // Initialize Pannellum when viewing details
  useEffect(() => {
    if (viewMode === 'detail' && selectedRoom && panoramaRef.current && window.pannellum) {
      // Destroy existing viewer if any (clean up)
      try {
         // This is a bit of a hack as Pannellum doesn't have a clean destroy method on the instance easily accessible here
         panoramaRef.current.innerHTML = ''; 
      } catch(e) {}

      window.pannellum.viewer(panoramaRef.current, {
        type: 'equirectangular',
        panorama: selectedRoom.image,
        autoLoad: true,
        autoRotate: -2, // Rotate to the left at 2 degrees per second
        compass: true,
        title: "360° View",
        author: "CORE.FTI"
      });
    }
  }, [viewMode, selectedRoom]);

  // Initialize Google API
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

  const initializeGapiClient = async () => {
    try {
        await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        });
        setIsGapiReady(true);
    } catch (error) {
        console.error("Error initializing GAPI:", error);
    }
  };

  const initializeGisClient = () => {
    try {
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (resp: any) => {
                if (resp.error !== undefined) {
                    throw resp;
                }
                setIsGoogleAuthenticated(true);
            },
        });
        setTokenClient(client);
    } catch (error) {
        console.error("Error initializing GIS", error);
    }
  };

  const handleAuthClick = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const getCalendarId = (input: string) => {
    if (!input) return null;
    const cleanInput = input.trim();
    // Jika input bukan URL (tidak ada http), asumsikan itu adalah Calendar ID langsung
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

  const fetchRoomEvents = async () => {
      if (!selectedRoom?.googleCalendarUrl || !isGapiReady) return;
      
      const calendarId = getCalendarId(selectedRoom.googleCalendarUrl);
      if (!calendarId) return;

      setIsCalendarLoading(true);
      try {
          const request = {
              'calendarId': calendarId,
              'timeMin': (new Date()).toISOString(),
              'showDeleted': false,
              'singleEvents': true,
              'maxResults': 5, // Limit for small view
              'orderBy': 'startTime',
          };
          const response = await window.gapi.client.calendar.events.list(request);
          setCalendarEvents(response.result.items);
      } catch (e) {
          console.error(e);
      } finally {
          setIsCalendarLoading(false);
      }
  };

  // Fetch events when dependencies change
  useEffect(() => {
      if (viewMode === 'detail' && selectedRoom && isGapiReady) {
          fetchRoomEvents();
      }
  }, [viewMode, selectedRoom, isGapiReady]);

  const formatEventTime = (dateTime?: string, date?: string) => {
    if (dateTime) {
      return new Date(dateTime).toLocaleString('id-ID', { 
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
      });
    }
    if (date) {
      return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + " (All Day)";
    }
    return "-";
  };

  const handleBookingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate File Type (PDF)
      if (file.type !== 'application/pdf') {
        alert("File harus berformat PDF!");
        e.target.value = '';
        return;
      }

      // Validate File Size (Max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file maksimal 5MB!");
        e.target.value = '';
        return;
      }

      setBookingFile(file);
      setBookingForm(prev => ({ ...prev, proposalFile: file.name }));
    }
  };

  // Schedule Handlers
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

  // Check Availability against Google Calendar
  const checkGoogleCalendarAvailability = async (calendarId: string, date: string, startTime: string, endTime: string) => {
    try {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return false;

      const response = await window.gapi.client.calendar.events.list({
        calendarId: calendarId,
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        singleEvents: true,
        showDeleted: false
      });

      // Filter overlap: (StartA < EndB) && (EndA > StartB)
      const conflicts = response.result.items.filter((event: any) => {
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          return eventStart < endDateTime && eventEnd > startDateTime;
      });

      return conflicts.length > 0;
    } catch (error) {
      console.error("Error checking availability:", error);
      return false; 
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingFile) {
       alert("Mohon upload surat permohonan peminjaman.");
       return;
    }
    
    // Validasi Konflik dengan Google Calendar
    if (selectedRoom?.googleCalendarUrl && isGapiReady) {
        const calendarId = getCalendarId(selectedRoom.googleCalendarUrl);
        if (calendarId) {
            setIsBookingLoading(true);
            for (const schedule of bookingSchedules) {
                const isBusy = await checkGoogleCalendarAvailability(calendarId, schedule.date, schedule.startTime, schedule.endTime);
                if (isBusy) {
                    alert(`GAGAL: Jadwal bentrok! Ruangan sudah terpakai di Google Calendar pada tanggal ${schedule.date} pukul ${schedule.startTime} - ${schedule.endTime}.`);
                    setIsBookingLoading(false);
                    return;
                }
            }
            setIsBookingLoading(false);
        }
    }

    const scheduleSummary = bookingSchedules.map(s => `- ${s.date} (${s.startTime} - ${s.endTime})`).join('\n');

    // Simpan ke Mock Data (Simulasi Backend)
    alert(`Permohonan berhasil dikirim dan jadwal TERSEDIA!\n\nJadwal Kegiatan:\n${scheduleSummary}\n\nPenanggung Jawab: ${bookingForm.responsiblePerson}\nFile: ${bookingForm.proposalFile}`);
    
    // Reset and go back
    setBookingFile(null);
    setBookingForm({ purpose: '', responsiblePerson: '', contactPerson: '', proposalFile: '' });
    setBookingSchedules([{ date: '', startTime: '', endTime: '' }]);
    setViewMode('list');
  };

  // CRUD Handlers
  const handleAddNew = () => {
    // Restrict Access
    if (role !== Role.ADMIN) {
        alert("Akses Ditolak. Hanya Admin yang bisa menambah ruangan.");
        return;
    }

    setFormData({
      name: '', description: '', capacity: 0, pic: activeTechnicians[0]?.name || '', image: '', facilities: [], googleCalendarUrl: ''
    });
    setIsEditing(false);
    setViewMode('form');
  };

  const handleEdit = (room: Room) => {
    setFormData(room);
    setIsEditing(true);
    setViewMode('form');
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      setRooms(prev => prev.filter(r => r.id !== deleteTargetId));
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsImageProcessing(true);
      
      // Simulate Processing
      setTimeout(() => {
        // In real app: Server converts to WebP & resizes to <5MB
        // Here: Just create an object URL
        if (e.target.files) {
            const url = URL.createObjectURL(e.target.files[0]);
            setFormData(prev => ({ ...prev, image: url }));
            setIsImageProcessing(false);
        }
      }, 2000);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && formData.id) {
       setRooms(prev => prev.map(r => r.id === formData.id ? { ...r, ...formData } as Room : r));
    } else {
       const newRoom = { ...formData, id: Date.now().toString() } as Room;
       setRooms(prev => [...prev, newRoom]);
    }
    setViewMode('list');
  };

  // Calendar Visual Logic
  const getDaysInMonth = () => Array.from({length: 30}, (_, i) => i + 1);
  const isBooked = (day: number) => day % 3 === 0; // Mock

  // --- RENDERERS ---

  if (viewMode === 'form') {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">{isEditing ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}</h2>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Ruangan</label>
               <input 
                  type="text" required value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kapasitas (Orang)</label>
               <input 
                  type="number" required value={formData.capacity || ''} 
                  onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
               />
            </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
               <textarea 
                  rows={3} required value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PIC (Penanggung Jawab)</label>
               <select 
                  required
                  value={formData.pic || ''} 
                  onChange={e => setFormData({...formData, pic: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500"
               >
                  <option value="">-- Pilih PIC (Teknisi) --</option>
                  {activeTechnicians.map(tech => (
                      <option key={tech.id} value={tech.name}>{tech.name} (Teknisi)</option>
                  ))}
               </select>
               <p className="text-xs text-gray-500 mt-1">*Hanya teknisi aktif yang ditampilkan</p>
            </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Calendar ID</label>
               <input 
                  type="text" value={formData.googleCalendarUrl || ''} 
                  onChange={e => setFormData({...formData, googleCalendarUrl: e.target.value})}
                  placeholder='Contoh: fti.laboran@adm.uksw.edu atau c_...@group.calendar.google.com'
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
               />
               <p className="text-xs text-gray-500 mt-1">Masukkan ID Kalender (email/group ID) atau URL Embed.</p>
            </div>
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Gambar 360</label>
               <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {isImageProcessing ? (
                     <div className="flex flex-col items-center text-blue-600">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-sm font-semibold">Converting to WebP & Compressing to &lt; 5MB...</span>
                     </div>
                  ) : formData.image ? (
                     <div className="flex flex-col items-center">
                        <img src={formData.image} alt="Preview" className="h-32 object-cover rounded mb-3" />
                        <button type="button" onClick={() => setFormData({...formData, image: ''})} className="text-red-500 text-sm hover:underline">Hapus Gambar</button>
                     </div>
                  ) : (
                     <label className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Klik untuk upload (JPG/PNG)</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                     </label>
                  )}
               </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
             <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Batal</button>
             <button type="submit" disabled={isImageProcessing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Simpan</button>
          </div>
        </form>
      </div>
    );
  }

  if (viewMode === 'detail' && selectedRoom) {
      return (
          <div className="space-y-6">
              <button onClick={() => setViewMode('list')} className="text-sm text-blue-500 hover:underline mb-4">&larr; Kembali ke daftar</button>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
                  {/* 360 Viewer Container */}
                  <div className="relative h-96 w-full bg-black group">
                      <div ref={panoramaRef} className="w-full h-full"></div>
                      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center backdrop-blur-sm pointer-events-none z-10">
                          <Eye className="w-4 h-4 mr-2" /> 360° Interactive View
                      </div>
                  </div>
                  
                  <div className="p-8">
                      <div className="flex flex-col md:flex-row justify-between items-start">
                          <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{selectedRoom.name}</h2>
                            <p className="text-gray-500 dark:text-gray-400 flex items-center mb-4"><Users className="w-4 h-4 mr-2"/> Kapasitas: {selectedRoom.capacity} Orang | PIC: {selectedRoom.pic}</p>
                          </div>
                          <div className="flex gap-2 mt-4 md:mt-0">
                             {(role === Role.ADMIN) && (
                                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium flex items-center">
                                    <Calendar className="w-4 h-4 mr-2"/> Atur Jadwal (Admin)
                                </button>
                             )}
                             <button 
                                onClick={() => setViewMode('booking')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-colors"
                             >
                                Ajukan Peminjaman
                             </button>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                          <div className="lg:col-span-2">
                              <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">Deskripsi</h3>
                              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{selectedRoom.description}</p>
                              
                              <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">Fasilitas</h3>
                              <div className="flex flex-wrap gap-2 mb-8">
                                  {selectedRoom.facilities.map((fac, idx) => (
                                      <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                          {fac}
                                      </span>
                                  ))}
                              </div>

                              {selectedRoom.googleCalendarUrl && (
                                 <div className="flex items-center text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                    <Check className="w-4 h-4 mr-2" />
                                    <span>Jadwal tersedia via Google Calendar</span>
                                 </div>
                              )}
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center justify-between flex-shrink-0">
                                  <span className="flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-500"/> Jadwal Ruangan</span>
                                  {isGapiReady && (
                                     <button onClick={fetchRoomEvents} className="text-gray-500 hover:text-blue-500" title="Refresh">
                                        <RefreshCw className={`w-4 h-4 ${isCalendarLoading ? 'animate-spin' : ''}`}/>
                                     </button>
                                  )}
                              </h3>
                              
                              {selectedRoom.googleCalendarUrl ? ( 
                                <div className="min-h-[250px] max-h-[400px] overflow-y-auto pr-1">
                                    {calendarEvents.length > 0 ? (
                                        <div className="space-y-3">
                                            {calendarEvents.map(event => (
                                                <a key={event.id} href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors group">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1">{event.summary}</h4>
                                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                                    </div>
                                                    <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                        <Clock className="w-3 h-3 mr-1" /> {formatEventTime(event.start.dateTime, event.start.date)}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
                                            <p className="text-sm">Tidak ada agenda mendatang.</p>
                                        </div>
                                    )}
                                </div> 
                              ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                                    <Calendar className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-sm">Jadwal belum dikonfigurasi</span>
                                </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )
  }

  if (viewMode === 'booking' && selectedRoom) {
      return (
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6 dark:text-white">Formulir Peminjaman Ruangan</h2>
              <form onSubmit={handleBookingSubmit} className="space-y-6">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruangan</label>
                      <input type="text" value={selectedRoom.name} disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500" />
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
                              id="file-upload" 
                              accept="application/pdf"
                              onChange={handleBookingFileChange}
                              className="hidden" 
                          />
                          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
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
                      <button type="button" onClick={() => setViewMode('detail')} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Batal</button>
                      <button type="submit" disabled={isBookingLoading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center disabled:opacity-50">
                          {isBookingLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} 
                          {isBookingLoading ? 'Cek Jadwal...' : 'Kirim Permohonan'}
                      </button>
                  </div>
              </form>
          </div>
      )
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daftar Ruangan</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Laboratorium FTI UKSW</p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Live Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white w-full md:w-64"
                />
            </div>
            
            <div className="relative">
                <select 
                   value={sortBy} 
                   onChange={(e) => setSortBy(e.target.value as 'name' | 'capacity')}
                   className="pl-3 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none cursor-pointer"
                >
                   <option value="name">Nama (A-Z)</option>
                   <option value="capacity">Kapasitas</option>
                </select>
                <ArrowUpDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>

            {(role === Role.ADMIN) && (
                <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Tambah
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <div key={room.id} onClick={() => { setSelectedRoom(room); setViewMode('detail'); }} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all flex flex-col group cursor-pointer">
            <div className="h-48 overflow-hidden relative bg-gray-200">
               {/* 360 Thumbnail Component */}
               <Room360Thumbnail room={room} />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">{room.name}</h3>
              <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-300">
                     Cap: {room.capacity}
                  </span>
                  {room.googleCalendarUrl && (
                    <span title="Calendar Synced">
                      <Check className="w-4 h-4 text-green-500" />
                    </span>
                  )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">{room.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                  {room.facilities.slice(0, 3).map((f, i) => (
                      <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{f}</span>
                  ))}
                  {room.facilities.length > 3 && <span className="text-xs text-gray-400 px-2 py-1">+more</span>}
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                 <div className="flex space-x-2 w-full">
                    {(role === Role.ADMIN) && (
                         <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                           <button onClick={() => handleEdit(room)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20" title="Edit">
                              <Edit2 className="w-4 h-4" />
                           </button>
                           <button onClick={() => handleDelete(room.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20" title="Delete">
                              <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                    )}
                    <button 
                        className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity text-center ml-auto"
                    >
                        Detail & 360°
                    </button>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-6 text-center">
                 <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hapus Ruangan?</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Apakah Anda yakin ingin menghapus ruangan ini? Data yang dihapus tidak dapat dikembalikan.
                 </p>
                 <div className="flex justify-center space-x-3">
                    <button 
                       onClick={() => setShowDeleteModal(false)} 
                       className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                       Batal
                    </button>
                    <button 
                       onClick={confirmDelete} 
                       className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                       Ya, Hapus
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;