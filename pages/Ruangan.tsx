import React, { useState, useEffect, useRef } from 'react';
import { Room, Role, BookingStatus, Booking, RoomComputer } from '../types';
import { Search, MapPin, Users, Wifi, Edit2, Trash2, Calendar, Eye, Check, Plus, Upload, Loader2, ArrowUpDown, ExternalLink, FileText, User, LogIn, RefreshCw, Clock, ChevronRight, X, Monitor, Cpu, HardDrive, Keyboard, Mouse, Download, FileSpreadsheet, ChevronLeft } from 'lucide-react';
import { api } from '../services/api';
import ExcelJS from 'exceljs';
import { CLIENT_ID, API_KEY, DISCOVERY_DOCS, SCOPES } from '../src/config/google';

// Declare Pannellum for TypeScript
declare global {
  interface Window {
    pannellum: any;
    gapi: any;
    google: any;
  }
}

const FTI_DRIVE_FOLDER_ID = ''; 

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

interface LabStaff {
  id: string;
  name: string;
  nim: string;
  email: string;
  phone: string;
  jabatan: 'Admin' | 'Teknisi' | 'Supervisor' | 'Kepala Sarpras';
  status: 'Aktif' | 'Non-Aktif';
}

// Sub-component for 360 Thumbnail in List View
const Room360Thumbnail: React.FC<{ room: Room }> = ({ room }) => {
    const thumbnailRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);

    useEffect(() => {
        if (thumbnailRef.current && window.pannellum) {
            const uniqueId = `pannellum-thumb-${room.id}`;
            thumbnailRef.current.id = uniqueId;

            try {
                if (viewerRef.current) {
                    try { viewerRef.current.destroy(); } catch(e) {}
                }

                viewerRef.current = window.pannellum.viewer(uniqueId, {
                    type: 'equirectangular',
                    panorama: room.image,
                    autoLoad: true,
                    autoRotate: 0,
                    compass: false,
                    showControls: false,
                    mouseZoom: false,
                    keyboardZoom: false,
                    draggable: true,
                    hfov: 100
                });
            } catch (error) {
                console.error("Pannellum error:", error);
            }
        }
        
        return () => {
            if (viewerRef.current) {
                try {
                    viewerRef.current.destroy();
                } catch(e) {
                    if (thumbnailRef.current) thumbnailRef.current.innerHTML = '';
                }
                viewerRef.current = null;
            }
        };
    }, [room.id, room.image]);

    const handleMouseEnter = () => {
        if (viewerRef.current) {
            viewerRef.current.startAutoRotate(-2);
        }
    };

    const handleMouseLeave = () => {
        if (viewerRef.current) {
            viewerRef.current.stopAutoRotate();
        }
    };

    return (
        <div 
            className="w-full h-full relative group cursor-pointer" 
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div ref={thumbnailRef} className="w-full h-full bg-gray-200" />
            
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop items-center z--blur-sm flex20 pointer-events-none">
                  <MapPin className="w-3 h-3 mr-1"/> FTI Lt. 4
            </div>
        </div>
    );
};

const getCategoryColor = (category?: string) => {
  switch (category) {
    case 'Laboratorium Komputer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    case 'Teori': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
    case 'Praktek': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
    case 'Rekreasi': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-200 dark:border-pink-800';
    case 'Meeting': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
    case 'Lounge': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
    case 'Open Space': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800';
    case 'Auditorium/Ruang Kuliah Umum': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  }
};

const getConditionColor = (condition?: string) => {
  switch (condition) {
    case 'Baik': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Rusak Ringan': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Rusak Berat': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const Ruangan: React.FC<RoomsProps> = ({ role, isDarkMode }) => {
  // Helper: Cek admin case-insensitive
  const isAdmin = role.toString().toUpperCase() === Role.ADMIN.toString().toUpperCase();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availableFacilities, setAvailableFacilities] = useState<string[]>([]);
  const [newFacilityInput, setNewFacilityInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'capacity'>('name');
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'booking' | 'form' | 'computers'>('list');

  // CRUD & Form State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Room>>({});
  const [isImageProcessing, setIsImageProcessing] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [labStaff, setLabStaff] = useState<LabStaff[]>([]);
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

  // Computer Specs State
  const [roomComputers, setRoomComputers] = useState<RoomComputer[]>([]);
  const [dominantSpec, setDominantSpec] = useState<any>(null);
  const [editingComputer, setEditingComputer] = useState<Partial<RoomComputer> | null>(null);

  // Filter Active Technicians for PIC Dropdown
  const activeTechnicians = labStaff; // API /api/staff already filters Active

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
        title: "Tampilan 360°",
        author: "Pannellum"
      });
    }
  }, [viewMode, selectedRoom]);

  // Initialize Google API
  useEffect(() => {
    fetchRooms();
    fetchStaff();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api('/api/rooms');
      if (res.ok) {
        const data: Room[] = await res.json();
        setRooms(data);

        // Create a dynamic list of unique facilities from all rooms + a base list
        const allFacs = new Set<string>();
        const baseFacilities = ["AC", "CCTV", "Komputer", "Meja", "Kursi", "Stop Kontak", "Proyektor", "Smart TV", "Interactive TV", "TV", "Console Cisco", "Videowall", "Sound/Speaker", "Mic", "Podium", "Green Screen", "Peralatan Fotografi & Videografi", "Internet LAN"];
        baseFacilities.forEach(f => allFacs.add(f));

        data.forEach((room) => {
            if (room.facilities) {
                room.facilities.forEach(fac => allFacs.add(fac));
            }
        });
        setAvailableFacilities(Array.from(allFacs).sort());
      }
    } catch (e) { console.error(e); }
  };

  const fetchStaff = async () => {
    try {
      const res = await api('/api/staff');
      if (res.ok) {
          const data = await res.json();
          // Pastikan mapping sesuai dengan yang diharapkan komponen
          const mappedStaff = data.map((s: any) => ({
              id: s.id,
              name: s.nama,
              jabatan: s.jabatan
          }));
          setLabStaff(mappedStaff);
      }
    } catch (e) { console.error(e); }
  };

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

  const fetchRoomComputers = async () => {
      if (!selectedRoom) return;
      try {
          const res = await api(`/api/rooms/${selectedRoom.id}/computers`);
          if (res.ok) setRoomComputers(await res.json());
      } catch (e) { console.error(e); }
  };

  const fetchDominantSpec = async () => {
      if (!selectedRoom) return;
      try {
          const res = await api(`/api/rooms/${selectedRoom.id}/specs-summary`);
          if (res.ok) setDominantSpec(await res.json());
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
      if (viewMode === 'detail' && selectedRoom) fetchDominantSpec();
      if (viewMode === 'computers' && selectedRoom) fetchRoomComputers();
  }, [viewMode, selectedRoom]);

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

      // Convert PDF to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
          setBookingFile(file); // Keep file object for validation if needed
          setBookingForm(prev => ({ ...prev, proposalFile: reader.result as string }));
      };
      reader.readAsDataURL(file);
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

    setIsBookingLoading(true);
    
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

    try {
        // Kirim data ke Backend (termasuk file base64)
        const res = await api('/api/bookings', {
            method: 'POST',
            data: {
                roomId: selectedRoom?.id,
                userId: localStorage.getItem('userId'), // Ambil ID user yang login
                responsiblePerson: bookingForm.responsiblePerson,
                contactPerson: bookingForm.contactPerson,
                purpose: bookingForm.purpose,
                proposalFile: bookingForm.proposalFile, // Base64 String
                schedules: bookingSchedules
            }
        });

        if (res.ok) {
            alert(`Permohonan berhasil dikirim!`);
        } else {
            const err = await res.json();
            alert(`Gagal mengirim permohonan: ${err.error}`);
        }
    } catch (e) {
        alert("Terjadi kesalahan saat mengirim data.");
    }
    
    // Reset and go back
    setIsBookingLoading(false);
    setBookingFile(null);
    setBookingForm({ purpose: '', responsiblePerson: '', contactPerson: '', proposalFile: '' });
    setBookingSchedules([{ date: '', startTime: '', endTime: '' }]);
    setViewMode('list');
  };

  // CRUD Handlers
  const handleAddNew = () => {
    // Restrict Access
    if (!isAdmin) {
        alert("Akses Ditolak. Hanya Admin yang bisa menambah ruangan.");
        return;
    }

    setFormData({
      name: '', category: 'Laboratorium Komputer', description: '', capacity: 0, pic: activeTechnicians[0]?.name || '', image: '', facilities: [], googleCalendarUrl: ''
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

  const confirmDelete = async () => {
    if (deleteTargetId) {
      try {
        await api(`/api/rooms/${deleteTargetId}`, { method: 'DELETE' });
        fetchRooms();
      } catch (e) { alert("Gagal menghapus"); }
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsImageProcessing(true);
      
      // Convert to Base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
          setFormData(prev => ({ ...prev, image: reader.result as string }));
          setIsImageProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewFacility = () => {
    const newFac = newFacilityInput.trim();
    if (newFac) {
        // Add to current room's form data
        const currentFacilities = formData.facilities || [];
        if (!currentFacilities.includes(newFac)) {
             setFormData({ ...formData, facilities: [...currentFacilities, newFac] });
        }

        // Add to the global available list for this session if it's not there
        if (!availableFacilities.includes(newFac)) {
            setAvailableFacilities(prev => [...prev, newFac].sort());
        }
        
        setNewFacilityInput('');
    }
  };

  const handleSaveComputer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingComputer || !selectedRoom) return;

      const payload = {
          ...editingComputer,
          id: editingComputer.id || `PC-${Date.now()}`,
          roomId: selectedRoom.id
      };

      try {
          await api('/api/computers', { method: 'POST', data: payload });
          setEditingComputer(null);
          fetchRoomComputers();
      } catch (e) { alert("Gagal menyimpan data komputer"); }
  };

  const handleDeleteComputer = async (id: string) => {
      if (confirm("Hapus data komputer ini?")) {
          try {
              await api(`/api/computers/${id}`, { method: 'DELETE' });
              fetchRoomComputers();
          } catch (e) { alert("Gagal menghapus"); }
      }
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Komputer');

    worksheet.columns = [
      { header: 'No PC', key: 'pcNumber', width: 10 },
      { header: 'OS', key: 'os', width: 15 },
      { header: 'CPU', key: 'cpu', width: 25 },
      { header: 'Tipe GPU (Integrated/Dedicated)', key: 'gpuType', width: 25 },
      { header: 'Model GPU', key: 'gpuModel', width: 20 },
      { header: 'VRAM', key: 'vram', width: 10 },
      { header: 'RAM', key: 'ram', width: 10 },
      { header: 'Storage', key: 'storage', width: 25 },
      { header: 'Monitor', key: 'monitor', width: 20 },
      { header: 'Keyboard', key: 'keyboard', width: 20 },
      { header: 'Mouse', key: 'mouse', width: 20 },
      { header: 'Kondisi', key: 'condition', width: 15 },
    ];

    worksheet.addRow({
      pcNumber: 'PC-01',
      os: 'Windows 11',
      cpu: 'Intel Core i5-12400',
      gpuType: 'Integrated',
      gpuModel: 'Intel UHD 730',
      vram: '-',
      ram: '16GB',
      storage: 'SSD 512GB',
      monitor: 'Dell 24"',
      keyboard: 'Logitech',
      mouse: 'Logitech',
      condition: 'Baik'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_data_komputer.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedRoom) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const buffer = event.target?.result as ArrayBuffer;
          try {
              const workbook = new ExcelJS.Workbook();
              await workbook.xlsx.load(buffer);
              const worksheet = workbook.getWorksheet(1);

              if (!worksheet) {
                  alert("File Excel kosong atau format salah.");
                  return;
              }

              const promises: Promise<any>[] = [];

              worksheet.eachRow((row, rowNumber) => {
                  if (rowNumber === 1) return; // Skip header

                  const pcNumber = row.getCell(1).text;
                  if (!pcNumber) return;

                  const payload = {
                      id: `PC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                      roomId: selectedRoom.id,
                      pcNumber: pcNumber,
                      os: row.getCell(2).text,
                      cpu: row.getCell(3).text,
                      gpuType: row.getCell(4).text || 'Integrated',
                      gpuModel: row.getCell(5).text,
                      vram: row.getCell(6).text,
                      ram: row.getCell(7).text,
                      storage: row.getCell(8).text,
                      monitor: row.getCell(9).text,
                      keyboard: row.getCell(10).text,
                      mouse: row.getCell(11).text,
                      condition: row.getCell(12).text || 'Baik',
                  };

                  promises.push(api('/api/computers', { method: 'POST', data: payload }));
              });

              await Promise.all(promises);
              alert(`Berhasil mengimport data komputer.`);
              fetchRoomComputers();
          } catch (error) {
              console.error(error);
              alert("Gagal memproses file Excel.");
          }
      };
      reader.readAsArrayBuffer(file);
  };

  const handleDeleteAllComputers = async () => {
      if (!selectedRoom) return;
      if (confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data komputer di ruangan ${selectedRoom.name}? Tindakan ini tidak dapat dibatalkan.`)) {
          try {
              await api(`/api/rooms/${selectedRoom.id}/computers`, { method: 'DELETE' });
              alert("Semua data komputer di ruangan ini telah dihapus.");
              fetchRoomComputers();
          } catch (e) {
              console.error(e);
              alert("Gagal menghapus data.");
          }
      }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi Kapasitas
    if (!formData.capacity || formData.capacity <= 0) {
      alert("Kapasitas ruangan harus lebih dari 0.");
      return;
    }

    // Bersihkan fasilitas dari string kosong sebelum kirim
    const payload = {
        ...formData,
        facilities: formData.facilities?.filter(f => f.trim() !== '') || []
    };

    try {
      let response;
      if (isEditing && formData.id) {
         response = await api(`/api/rooms/${formData.id}`, {
            method: 'PUT',
            data: payload
         });
      } else {
         const newId = `ROOM-${Date.now()}`;
         response = await api('/api/rooms', {
            method: 'POST',
            data: { ...payload, id: newId }
         });
      }
      
      if (response.ok) {
        fetchRooms();
        setViewMode('list');
      } else {
        const err = await response.json();
        alert(`Gagal menyimpan data: ${err.error || 'Terjadi kesalahan di server'}`);
      }
    } catch (e) {
      alert("Gagal menyimpan data");
    }
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
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori Ruangan</label>
               <select 
                  required 
                  value={formData.category || 'Laboratorium Komputer'} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500"
               >
                  <option value="Laboratorium Komputer">Laboratorium Komputer</option>
                  <option value="Teori">Teori</option>
                  <option value="Praktek">Praktek</option>
                  <option value="Rekreasi">Rekreasi</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Lounge">Lounge</option>
                  <option value="Open Space">Open Space</option>
                  <option value="Auditorium/Ruang Kuliah Umum">Auditorium/Ruang Kuliah Umum</option>
               </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kapasitas (Orang)</label>
               <input 
                  type="number" min="0" required value={formData.capacity || ''} 
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
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fasilitas</label>
               <div className="p-3 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                     {availableFacilities.map((fac) => {
                        const isSelected = (formData.facilities || []).includes(fac);
                        return (
                           <button
                              type="button"
                              key={fac}
                              onClick={() => {
                                 const currentFacilities = formData.facilities || [];
                                 const newFacilities = isSelected 
                                    ? currentFacilities.filter(f => f !== fac)
                                    : [...currentFacilities, fac];
                                 setFormData({ ...formData, facilities: newFacilities });
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center ${
                                 isSelected 
                                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                           >
                              {isSelected && <Check className="w-3 h-3 mr-1.5" />}
                              {fac}
                           </button>
                        );
                     })}
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-500">
                      <input
                          type="text"
                          value={newFacilityInput}
                          onChange={(e) => setNewFacilityInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewFacility(); } }}
                          placeholder="Ketik fasilitas baru lalu Enter..."
                          className="flex-1 px-3 py-1.5 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-500 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                          type="button"
                          onClick={handleAddNewFacility}
                          className="px-4 py-1.5 bg-gray-200 dark:bg-gray-600 text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                          Tambah
                      </button>
                  </div>
               </div>
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
                  {labStaff.map(tech => (
                      <option key={tech.id} value={tech.name}>{tech.name} ({tech.jabatan || 'Staff'})</option>
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
                        <span className="text-sm font-semibold">Memproses Gambar...</span>
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
                      <div className="absolute top-4 left-10 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center backdrop-blur-sm pointer-events-none z-10">
                          <Eye className="w-4 h-4 mr-2" /> Tampilan Interaktif 360°
                      </div>
                  </div>
                  
                  <div className="p-8">
                      <div className="flex flex-col md:flex-row justify-between items-start">
                          <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{selectedRoom.name}</h2>
                            <div className="mb-3">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedRoom.category)}`}>{selectedRoom.category}</span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 flex items-center mb-4"><Users className="w-4 h-4 mr-2"/> Kapasitas: {selectedRoom.capacity} Orang | PIC: {selectedRoom.pic}</p>
                          </div>
                          <div className="flex gap-2 mt-4 md:mt-0">
                             {(isAdmin) && (
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

                              {/* Spesifikasi Komputer (Dominan) */}
                              <div className="mb-8">
                                  <div className="flex justify-between items-center mb-3">
                                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                                          <Monitor className="w-5 h-5 mr-2 text-blue-500"/> Spesifikasi Komputer
                                      </h3>
                                      {(isAdmin || role === Role.LABORAN) && (
                                          <button 
                                              onClick={() => setViewMode('computers')}
                                              className="text-sm text-blue-600 hover:underline font-medium"
                                          >
                                              Kelola Unit
                                          </button>
                                      )}
                                  </div>
                                  
                                  {dominantSpec ? (
                                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                          <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                                              <span className="text-sm font-bold text-gray-500 uppercase">Standar Lab ({dominantSpec.dominantCount} dari {dominantSpec.totalUnits} Unit)</span>
                                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-mono">{dominantSpec.os}</span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                              <div className="flex items-start">
                                                  <Cpu className="w-4 h-4 mr-2 text-gray-400 mt-0.5"/>
                                                  <div>
                                                      <span className="block font-medium text-gray-900 dark:text-white">{dominantSpec.cpu}</span>
                                                      <span className="text-xs text-gray-500">Processor</span>
                                                  </div>
                                              </div>
                                              <div className="flex items-start">
                                                  <div className="w-4 h-4 mr-2 text-gray-400 mt-0.5 font-bold text-[10px] border border-gray-400 rounded flex items-center justify-center">G</div>
                                                  <div>
                                                      <span className="block font-medium text-gray-900 dark:text-white">{dominantSpec.gpu_model}</span>
                                                      <span className="text-xs text-gray-500">{dominantSpec.gpu_type} ({dominantSpec.vram})</span>
                                                  </div>
                                              </div>
                                              <div className="flex items-start">
                                                  <div className="w-4 h-4 mr-2 text-gray-400 mt-0.5 font-bold text-[10px] border border-gray-400 rounded flex items-center justify-center">R</div>
                                                  <div>
                                                      <span className="block font-medium text-gray-900 dark:text-white">{dominantSpec.ram}</span>
                                                      <span className="text-xs text-gray-500">RAM</span>
                                                  </div>
                                              </div>
                                              <div className="flex items-start">
                                                  <HardDrive className="w-4 h-4 mr-2 text-gray-400 mt-0.5"/>
                                                  <div>
                                                      <span className="block font-medium text-gray-900 dark:text-white">{dominantSpec.storage}</span>
                                                      <span className="text-xs text-gray-500">Storage</span>
                                                  </div>
                                              </div>
                                              <div className="flex items-start">
                                                  <Monitor className="w-4 h-4 mr-2 text-gray-400 mt-0.5"/>
                                                  <div>
                                                      <span className="block font-medium text-gray-900 dark:text-white">{dominantSpec.monitor}</span>
                                                      <span className="text-xs text-gray-500">Monitor</span>
                                                  </div>
                                              </div>
                                              <div className="flex items-start">
                                                  <Keyboard className="w-4 h-4 mr-2 text-gray-400 mt-0.5"/>
                                                  <div>
                                                      <span className="block font-medium text-gray-900 dark:text-white">{dominantSpec.keyboard} & {dominantSpec.mouse}</span>
                                                      <span className="text-xs text-gray-500">Peripherals</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-gray-500 text-sm italic">
                                          Belum ada data spesifikasi komputer.
                                      </div>
                                  )}
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

  // --- MANAGE COMPUTERS VIEW ---
  if (viewMode === 'computers' && selectedRoom) {
      return (
          <div className="space-y-6">
              <div className="flex items-center justify-between">
                  <button onClick={() => setViewMode('detail')} className="text-sm text-blue-500 hover:underline flex items-center">
                      <ChevronRight className="w-4 h-4 rotate-180 mr-1"/> Kembali ke Detail Ruangan
                  </button>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kelola Unit Komputer: {selectedRoom.name}</h2>
                  <div className="flex gap-2">
                      <button onClick={handleDeleteAllComputers} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center shadow-sm" title="Hapus semua data komputer di ruangan ini (Reset)">
                          <Trash2 className="w-4 h-4 mr-2"/> Reset Data
                      </button>
                      <button onClick={handleDownloadTemplate} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center shadow-sm">
                          <Download className="w-4 h-4 mr-2"/> Template
                      </button>
                      <label className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center cursor-pointer shadow-sm">
                          <FileSpreadsheet className="w-4 h-4 mr-2"/> Import Excel
                          <input type="file" accept=".xlsx" className="hidden" onChange={handleExcelUpload} />
                      </label>
                      <button 
                          onClick={() => setEditingComputer({ pcNumber: '', cpu: '', gpuType: 'Integrated', gpuModel: '', vram: '', ram: '', storage: '', os: '', keyboard: '', mouse: '', monitor: '', condition: 'Baik' })}
                          className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 dark:hover:bg-gray-600 flex items-center shadow-sm"
                      >
                          <Plus className="w-4 h-4 mr-2"/> Tambah Unit
                      </button>
                  </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
                              <tr>
                                  <th className="px-4 py-3">No. PC</th>
                                  <th className="px-4 py-3">CPU</th>
                                  <th className="px-4 py-3">GPU</th>
                                  <th className="px-4 py-3">RAM/Storage</th>
                                  <th className="px-4 py-3">Kondisi</th>
                                  <th className="px-4 py-3">OS</th>
                                  <th className="px-4 py-3 text-right">Aksi</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {roomComputers.map(pc => (
                                  <tr key={pc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                      <td className="px-4 py-3 font-bold">{pc.pcNumber}</td>
                                      <td className="px-4 py-3">{pc.cpu}</td>
                                      <td className="px-4 py-3">
                                          <div className="text-xs">{pc.gpuModel}</div>
                                          <div className="text-[10px] text-gray-500">{pc.gpuType} ({pc.vram})</div>
                                      </td>
                                      <td className="px-4 py-3">
                                          <div>{pc.ram}</div>
                                          <div className="text-xs text-gray-500">{pc.storage}</div>
                                      </td>
                                      <td className="px-4 py-3">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getConditionColor(pc.condition)}`}>{pc.condition}</span>
                                      </td>
                                      <td className="px-4 py-3">{pc.os}</td>
                                      <td className="px-4 py-3 text-right">
                                          <button onClick={() => setEditingComputer(pc)} className="text-blue-600 hover:text-blue-800 mr-3"><Edit2 className="w-4 h-4"/></button>
                                          <button onClick={() => handleDeleteComputer(pc.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4"/></button>
                                      </td>
                                  </tr>
                              ))}
                              {roomComputers.length === 0 && (
                                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">Belum ada data komputer.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* Modal Edit/Add Computer */}
              {editingComputer && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                              <h3 className="font-bold text-gray-900 dark:text-white">{editingComputer.id ? 'Edit Spesifikasi' : 'Tambah Unit Baru'}</h3>
                              <button onClick={() => setEditingComputer(null)}><X className="w-5 h-5 text-gray-500"/></button>
                          </div>
                          <form onSubmit={handleSaveComputer} className="p-6 grid grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto">
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Nomor PC</label>
                                  <input type="text" required value={editingComputer.pcNumber || ''} onChange={e => setEditingComputer({...editingComputer, pcNumber: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="PC-01"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">OS</label>
                                  <input type="text" value={editingComputer.os || ''} onChange={e => setEditingComputer({...editingComputer, os: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Windows 11 Pro"/>
                              </div>
                              <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-500 mb-1">CPU & GHz</label>
                                  <input type="text" required value={editingComputer.cpu || ''} onChange={e => setEditingComputer({...editingComputer, cpu: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Intel Core i7-12700 @ 2.10GHz"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipe GPU</label>
                                  <select value={editingComputer.gpuType || 'Integrated'} onChange={e => setEditingComputer({...editingComputer, gpuType: e.target.value as any})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                      <option value="Integrated">Integrated</option>
                                      <option value="Dedicated">Dedicated (Card)</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Model GPU</label>
                                  <input type="text" value={editingComputer.gpuModel || ''} onChange={e => setEditingComputer({...editingComputer, gpuModel: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="NVIDIA RTX 3060"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">VRAM</label>
                                  <input type="text" value={editingComputer.vram || ''} onChange={e => setEditingComputer({...editingComputer, vram: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="12 GB"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">RAM</label>
                                  <input type="text" value={editingComputer.ram || ''} onChange={e => setEditingComputer({...editingComputer, ram: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="16 GB DDR4"/>
                              </div>
                              <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Storage (Type & Health)</label>
                                  <input type="text" value={editingComputer.storage || ''} onChange={e => setEditingComputer({...editingComputer, storage: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="SSD NVMe 512GB (Health: 98%)"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Monitor</label>
                                  <input type="text" value={editingComputer.monitor || ''} onChange={e => setEditingComputer({...editingComputer, monitor: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Dell 24 inch"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Keyboard</label>
                                  <input type="text" value={editingComputer.keyboard || ''} onChange={e => setEditingComputer({...editingComputer, keyboard: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Logitech Standard"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Mouse</label>
                                  <input type="text" value={editingComputer.mouse || ''} onChange={e => setEditingComputer({...editingComputer, mouse: e.target.value})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Logitech Optical"/>
                              </div>
                              <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Kondisi Unit</label>
                                  <select value={editingComputer.condition || 'Baik'} onChange={e => setEditingComputer({...editingComputer, condition: e.target.value as any})} className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                      <option value="Baik">Baik</option>
                                      <option value="Rusak Ringan">Rusak Ringan</option>
                                      <option value="Rusak Berat">Rusak Berat</option>
                                  </select>
                              </div>

                              <div className="col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <button type="button" onClick={() => setEditingComputer(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Simpan</button>
                              </div>
                          </form>
                      </div>
                  </div>
              )}
          </div>
      );
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
           <p className="text-gray-500 dark:text-gray-400 text-sm">Ruang Laboratorium/Praktek dan Teori FTI UKSW</p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Cari Ruangan..." 
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

            {(isAdmin) && (
                <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Tambah
                </button>
            )}
        </div>
      </div>

      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.id} onClick={() => { setSelectedRoom(room); setViewMode('detail'); }} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all flex flex-col group cursor-pointer">
              <div className="h-48 overflow-hidden relative bg-gray-200">
                 {/* 360 Thumbnail Component */}
                 <Room360Thumbnail room={room} />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">{room.name}</h3>
                <div className="mb-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${getCategoryColor(room.category)}`}>{room.category}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-300">
                       Kap: {room.capacity}
                    </span>
                    {room.googleCalendarUrl && (
                      <span title="Kalender Tersinkronisasi">
                        <Check className="w-4 h-4 text-green-500" />
                      </span>
                    )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">{room.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {room.facilities.slice(0, 3).map((f, i) => (
                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{f}</span>
                    ))}
                    {room.facilities.length > 3 && <span className="text-xs text-gray-400 px-2 py-1">+lainnya</span>}
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                   <div className="flex space-x-2 w-full">
                      {(isAdmin) && (
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
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                <MapPin className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Tidak ada ruangan ditemukan</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Coba ubah kata kunci pencarian atau tambahkan ruangan baru jika Anda adalah admin.
            </p>
        </div>
      )}

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

export default Ruangan;