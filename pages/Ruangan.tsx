import React, { useState, useEffect, useRef } from 'react';
import { Room, Role, BookingStatus, Booking, RoomComputer, Software } from '../types';
import { Search, MapPin, Users, Wifi, Edit2, Trash2, Calendar, Eye, Check, Plus, Upload, Loader2, ArrowUpDown, ExternalLink, FileText, User, LogIn, RefreshCw, Clock, ChevronRight, ChevronDown, X, Monitor, Cpu, HardDrive, Keyboard, Mouse, Download, FileSpreadsheet, ChevronLeft, Package, Filter, Info } from 'lucide-react';
import { api } from '../services/api';
import SoftwareForm from '../components/SoftwareForm';
import RoomForm from '../components/RoomForm';
import BookingForm from '../components/BookingForm';
import { Skeleton } from '../components/Skeleton';
import { useRooms } from '../hooks/useRooms';
import { CLIENT_ID, API_KEY, DISCOVERY_DOCS, SCOPES } from '../src/config/google';

// Declare Pannellum for TypeScript
declare global {
  interface Window {
    pannellum: any;
    gapi: any;
    google: any;
  }
}

interface RoomsProps {
  role: Role;
  isDarkMode: boolean;
  onNavigate?: (page: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
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
const Room360Thumbnail: React.FC<{ room: Room }> = React.memo(({ room }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const thumbnailRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [shouldLoadWebGL, setShouldLoadWebGL] = useState(false);
    const [showActivity, setShowActivity] = useState(false);

    // Menggunakan Intersection Observer untuk mendeteksi apakah elemen ada di dalam layar
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            // Kurangi margin agar tidak memuat terlalu banyak instance WebGL saat scroll cepat
            { rootMargin: '300px' } 
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
        };
    }, []);

    // Debounce: Tunggu 300ms sebelum me-load WebGL
    // Mencegah lag parah saat user men-scroll halaman dari atas ke bawah dengan sangat cepat
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isVisible) {
            timer = setTimeout(() => setShouldLoadWebGL(true), 300);
        } else {
            setShouldLoadWebGL(false);
        }
        return () => clearTimeout(timer);
    }, [isVisible]);

    useEffect(() => {
        // Hanya render (load) Pannellum jika shouldLoadWebGL === true
        if (shouldLoadWebGL && thumbnailRef.current && window.pannellum) {
            const uniqueId = `pannellum-thumb-${room.id}`;
            thumbnailRef.current.id = uniqueId;

            try {
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
        } else {
            // Unload viewer dan hapus instance WebGL ketika elemen keluar dari layar
            if (viewerRef.current) {
                try { viewerRef.current.destroy(); } catch(e) {}
                viewerRef.current = null;
            }
            if (thumbnailRef.current) {
                thumbnailRef.current.innerHTML = '';
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
    }, [room.id, room.image, shouldLoadWebGL]);

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
            ref={containerRef}
            className="w-full h-full relative group cursor-pointer overflow-hidden bg-gray-200" 
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Gambar statis sebagai placeholder (Cache Visual) */}
            <div 
                className="absolute inset-0 w-full h-full"
                style={{
                    backgroundImage: `url(${room.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            
            {/* Kontainer Pannellum */}
            <div ref={thumbnailRef} className="absolute inset-0 w-full h-full z-10" />
            
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center z-20 pointer-events-none">
                  <MapPin className="w-3 h-3 mr-1"/> {room.floor || 'Lantai 4'}
            </div>
            
            <div 
              onClick={(e) => {
                if ((room as any).currentStatus === 'Digunakan') {
                  e.stopPropagation();
                  setShowActivity(!showActivity);
                }
              }}
              className={`absolute top-2 left-2 text-white text-xs font-medium px-2 py-1 rounded backdrop-blur-sm flex items-center z-30 ${(room as any).currentStatus === 'Digunakan' ? 'bg-red-500/90 cursor-pointer pointer-events-auto shadow-sm hover:bg-red-600 transition-colors' : 'bg-green-500/80 pointer-events-none'}`}
            >
                  {(room as any).currentStatus || 'Tersedia'}
                  {(room as any).currentStatus === 'Digunakan' && <Info className="w-3 h-3 ml-1.5 opacity-80" />}
            </div>

            {/* Popover/Tooltip Kegiatan */}
            {showActivity && (room as any).currentStatus === 'Digunakan' && (
              <div 
                className="absolute top-10 left-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs p-3 rounded-lg shadow-xl z-40 w-56 border border-gray-200 dark:border-gray-700 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-1.5 mb-2">
                  <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[10px]">Sedang Berlangsung</span>
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-red-500 transition-colors" onClick={() => setShowActivity(false)} />
                </div>
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-1.5 leading-snug">{(room as any).currentActivity || 'Kegiatan tidak diketahui'}</p>
                <p className="text-gray-500 flex items-center bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded">
                  <Clock className="w-3 h-3 mr-1" />
                  Sampai: <span className="font-bold ml-1">{(room as any).currentActivityEnd ? ((room as any).currentActivityEnd as string).substring(0, 5) : 'Selesai'}</span> WIB
                </p>
              </div>
            )}
        </div>
    );
});

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

const Ruangan: React.FC<RoomsProps> = ({ role, isDarkMode, onNavigate, showToast }) => {
  // Helper: Cek admin case-insensitive
  const isAdmin = role.toString().toUpperCase() === Role.ADMIN.toString().toUpperCase();
  const isLaboran = role.toString().toUpperCase() === Role.LABORAN.toString().toUpperCase();
  const canManage = isAdmin || isLaboran;

  // Menggunakan custom hook useRooms (autoFetch dimatikan agar kontrol loading awal tetap dipegang Promise.all)
  const { rooms, fetchRooms: fetchRoomsApi } = useRooms({ autoFetch: false });
  const [availableFacilities, setAvailableFacilities] = useState<string[]>([]);
  const [newFacilityInput, setNewFacilityInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'capacity'>('name');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Tersedia' | 'Digunakan'>('All');
  
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

  // Expand/Collapse state untuk lantai
  const [collapsedFloors, setCollapsedFloors] = useState<Record<string, boolean>>(() => {
    // Coba baca dari Local Storage saat komponen pertama kali dirender
    const saved = localStorage.getItem('collapsedFloors_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  // Simpan ke Local Storage setiap kali state collapsedFloors berubah
  useEffect(() => {
    localStorage.setItem('collapsedFloors_state', JSON.stringify(collapsedFloors));
  }, [collapsedFloors]);

  // Pannellum Ref
  const panoramaRef = useRef<HTMLDivElement>(null);

  // Google API State
  const [calendarEvents, setCalendarEvents] = useState<GoogleEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);

  // Computer Specs State (Summary Only)
  const [roomComputers, setRoomComputers] = useState<RoomComputer[]>([]);
  const [dominantSpec, setDominantSpec] = useState<any>(null);
  const [editingComputer, setEditingComputer] = useState<Partial<RoomComputer> | null>(null);

  // Software State
  const [roomSoftware, setRoomSoftware] = useState<Software[]>([]);
  const [editingSoftware, setEditingSoftware] = useState<Partial<Software> | null>(null);
  // Software for List View (mapped by roomId)
  const [roomSoftwareMap, setRoomSoftwareMap] = useState<{ [roomId: string]: Software[] }>({});

  // Loading States for CRUD operations
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isSavingComputer, setIsSavingComputer] = useState(false);
  const [isSavingSoftware, setIsSavingSoftware] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // Filter Active Technicians for PIC Dropdown
  const activeTechnicians = labStaff; // API /api/staff already filters Active

  const toggleFloor = (floor: string) => {
    setCollapsedFloors(prev => ({
      ...prev,
      [floor]: prev[floor] === false
    }));
  };

  // Ekstrak daftar kategori unik dari data ruangan
  const categories = Array.from(new Set(rooms.map(room => room.category || 'Umum'))).sort();

  // Filter & Sort Logic
  const filteredRooms = rooms
    .filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (room.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || (room.category || 'Umum') === filterCategory;
      const matchesStatus = filterStatus === 'All' || (room as any).currentStatus === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.capacity - a.capacity;
    });

  // Mengelompokkan daftar ruangan yang sudah difilter berdasarkan Lantai
  const groupedRooms = React.useMemo(() => {
    const groups: Record<string, Room[]> = {};
    filteredRooms.forEach(room => {
      // Kelompokkan berdasarkan lantai, beri default jika kosong
      const floor = room.floor || 'Lantai 4';
      if (!groups[floor]) {
        groups[floor] = [];
      }
      groups[floor].push(room);
    });

    // Urutkan nama lantai secara abjad (Lantai 1, Lantai 2, dst)
    return Object.keys(groups).sort().map(floor => ({
      floor,
      rooms: groups[floor]
    }));
  }, [filteredRooms]);

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

  // Fetch Initial Data & Setup Auto-Refresh
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingRooms(true);
      await Promise.all([
        fetchRooms(),
        fetchStaff(),
        fetchAllSoftware()
      ]);
      setIsLoadingRooms(false);
    };

    loadInitialData();

    // Auto-refresh data ruangan setiap 1 menit (60000 ms) untuk memperbarui status Tersedia/Digunakan
    const intervalId = setInterval(() => {
      fetchRooms();
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Mengecek apakah ada instruksi navigasi ke detail ruangan tertentu dari halaman lain
  useEffect(() => {
    const targetId = localStorage.getItem('targetRoomId');
    if (targetId && rooms.length > 0) {
      const targetRoom = rooms.find(r => r.id === targetId);
      if (targetRoom) {
        setSelectedRoom(targetRoom);
        setViewMode('detail');
      }
      localStorage.removeItem('targetRoomId');
    }
  }, [rooms]);

  const fetchRooms = async () => {
    const data = await fetchRoomsApi();
    
    if (data) {
      // Create a dynamic list of unique facilities from all rooms + a base list
      const allFacs = new Set<string>();
      const baseFacilities = ["AC", "CCTV", "Komputer", "Meja", "Kursi", "Stop Kontak", "Proyektor", "Smart TV", "Interactive TV", "TV", "Console Cisco", "Videowall", "Sound/Speaker", "Mic", "Podium", "Green Screen", "Peralatan Fotografi & Videografi", "Internet LAN"];
      baseFacilities.forEach(f => allFacs.add(f));

      data.forEach(room => {
          if (room.facilities) {
              room.facilities.forEach(fac => allFacs.add(fac));
          }
      });
      setAvailableFacilities(Array.from(allFacs).sort());

      // Jika sedang membuka detail ruangan, update state selectedRoom agar status ketersediaannya ikut akurat
      setSelectedRoom(prev => {
          if (prev) {
              const updatedRoom = data.find(r => r.id === prev.id);
              return updatedRoom || prev;
          }
          return prev;
      });
    }
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
              jabatan: s.jabatan,
              status: s.status
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

  const fetchRoomSoftware = async () => {
      if (!selectedRoom) return;
      try {
          const res = await api(`/api/software?roomId=${selectedRoom.id}`);
          if (res.ok) {
              const data = await res.json();
              setRoomSoftware(data);
          }
      } catch (e) { console.error(e); }
  };

  // Fetch software for all Laboratorium Komputer rooms (for list view)
  const fetchAllSoftware = async () => {
      try {
          const res = await api('/api/software');
          if (res.ok) {
              const allSoftware: Software[] = await res.json();
              // Group software by roomId
              const softwareMap: { [roomId: string]: Software[] } = {};
              allSoftware.forEach((sw: Software) => {
                  if (sw.roomId) {
                      if (!softwareMap[sw.roomId]) {
                          softwareMap[sw.roomId] = [];
                      }
                      softwareMap[sw.roomId].push(sw);
                  }
              });
              setRoomSoftwareMap(softwareMap);
          }
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
      if (viewMode === 'detail' && selectedRoom) {
          fetchDominantSpec();
          // Fetch software for Laboratorium Komputer rooms
          if (selectedRoom.category === 'Laboratorium Komputer') {
              fetchRoomSoftware();
          }
      }
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

  // CRUD Handlers
  const handleAddNew = () => {
    // Restrict Access
    if (!canManage) {
        showToast("Akses Ditolak. Hanya Admin dan Laboran yang bisa menambah ruangan.", "error");
        return;
    }

    setFormData({
      name: '', category: 'Laboratorium Komputer', description: '', capacity: 0, pic: activeTechnicians[0]?.name || '', image: '', facilities: [], googleCalendarUrl: '', floor: 'Lantai 4'
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
        showToast("Ruangan berhasil dihapus.", "success");
      } catch (e) { showToast("Gagal menghapus", "error"); }
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

  const handleSaveRoom = async (submittedData: Partial<Room>) => {
    // Validasi Kapasitas (double check, sudah ada di form)
    if (!submittedData.capacity || submittedData.capacity <= 0) {
      showToast("Kapasitas ruangan harus lebih dari 0.", "warning");
      return;
    }

    // Set loading state
    setIsSavingRoom(true);

    // Bersihkan fasilitas dari string kosong sebelum kirim
    const { pic_id, ...cleanData } = submittedData as any;

    const payload = {
        ...cleanData,
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
        showToast("Data ruangan berhasil disimpan.", "success");
      } else {
        let errorMessage = 'Terjadi kesalahan di server';
        try {
            const err = await response.json();
            errorMessage = err.error || errorMessage;
        } catch {
            errorMessage = `Status: ${response.status} ${response.statusText}`;
        }
        showToast(`Gagal menyimpan data: ${errorMessage}`, "error");
      }
    } catch (e: any) {
      console.error("Save Room Error:", e);
      showToast(`Gagal menyimpan data. Detail: ${e.message || "Cek koneksi internet"}`, "error");
    } finally {
      setIsSavingRoom(false);
    }
  };

  // Computer management functions
  const handleDeleteComputer = async (id: string) => {
    if (!selectedRoom) return;
    if (confirm("Hapus data komputer ini?")) {
      try {
        await api(`/api/rooms/${selectedRoom.id}/computers/${id}`, { method: 'DELETE' });
        fetchRoomComputers();
        showToast("Data komputer berhasil dihapus.", "success");
      } catch (e) {
        showToast("Gagal menghapus data komputer", "error");
      }
    }
  };

  const handleSaveComputer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !editingComputer) return;

    try {
      let response;
      if (editingComputer.id) {
        response = await api(`/api/rooms/${selectedRoom.id}/computers/${editingComputer.id}`, {
          method: 'PUT',
          data: editingComputer
        });
      } else {
        response = await api(`/api/rooms/${selectedRoom.id}/computers`, {
          method: 'POST',
          data: { ...editingComputer, id: undefined }
        });
      }

      if (response.ok) {
        setEditingComputer(null);
        fetchRoomComputers();
        showToast("Data komputer berhasil disimpan.", "success");
      } else {
        showToast("Gagal menyimpan data komputer", "error");
      }
    } catch (e) {
      showToast("Gagal menyimpan data komputer", "error");
    }
  };

  // Software management functions
  const handleDeleteSoftware = async (id: string) => {
    if (!selectedRoom) return;
    if (confirm("Hapus data software ini?")) {
      try {
        await api(`/api/software/${id}`, { method: 'DELETE' });
        fetchRoomSoftware();
        showToast("Data software berhasil dihapus.", "success");
      } catch (e) {
        showToast("Gagal menghapus data software", "error");
      }
    }
  };

  const handleSaveSoftware = async (softwareData: Partial<Software>) => {
    if (!selectedRoom) return;

    try {
      let response;
      const payload = {
        ...softwareData,
        roomId: selectedRoom.id
      };
      
      if (softwareData.id) {
        response = await api(`/api/software/${softwareData.id}`, {
          method: 'PUT',
          data: payload
        });
      } else {
        response = await api('/api/software', {
          method: 'POST',
          data: payload
        });
      }

      if (response.ok) {
        setEditingSoftware(null);
        fetchRoomSoftware();
        showToast("Data software berhasil disimpan.", "success");
      }
    } catch (e) { console.error(e); showToast("Gagal menyimpan data software", "error"); }
  };

  // Calendar Visual Logic
  const getDaysInMonth = () => Array.from({length: 30}, (_, i) => i + 1);
  const isBooked = (day: number) => day % 3 === 0; // Mock

  const handleBackToList = () => {
    const returnToLaboran = localStorage.getItem('returnToLaboranId');
    if (returnToLaboran && onNavigate) {
        onNavigate('laboran-management');
    } else {
        setViewMode('list');
    }
  };

  // --- RENDERERS ---

  if (isLoadingRooms) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            {canManage && <Skeleton className="h-10 w-24 rounded-lg" />}
          </div>
        </div>
        <div className="space-y-10 mt-4">
          <div>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[400px]">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <div className="p-5 flex-1 flex flex-col">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/4 mb-4" />
                    <div className="flex gap-2 mb-4">
                      <Skeleton className="h-6 w-16 rounded" />
                      <Skeleton className="h-6 w-16 rounded" />
                    </div>
                    <Skeleton className="h-12 w-full mb-4" />
                    <div className="mt-auto flex justify-end">
                      <Skeleton className="h-9 w-28 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'form') {
    return (
      <RoomForm
        initialData={formData}
        isEditing={isEditing}
        onSave={handleSaveRoom}
        onCancel={() => setViewMode('list')}
        staffList={labStaff.filter(s => s.status === 'Aktif')}
        availableFacilities={availableFacilities}
        isSaving={isSavingRoom}
      />
    );
  }

  if (viewMode === 'detail' && selectedRoom) {
      return (
          <div className="space-y-6">
              <button onClick={handleBackToList} className="text-sm text-blue-500 hover:underline mb-4 flex items-center">
                <ChevronLeft className="w-4 h-4 mr-1" /> Kembali ke daftar
              </button>
              
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
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedRoom.category)}`}>{selectedRoom.category || 'Umum'}</span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 flex items-center flex-wrap gap-2 mb-4">
                                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1"/> {selectedRoom.floor || 'Lantai 4'}</span>
                                <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
                                <span className="flex items-center"><Users className="w-4 h-4 mr-1"/> Kapasitas: {selectedRoom.capacity} Orang</span>
                                {(selectedRoom.computerCount && selectedRoom.computerCount > 0) ? (
                                    <>
                                        <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
                                        <span className="flex items-center"><Monitor className="w-4 h-4 mr-1"/> {selectedRoom.computerCount} Unit PC</span>
                                    </>
                                ) : null}
                                <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>
                                <span>PIC: {selectedRoom.pic}</span>
                            </p>
                          </div>
                          <div className="flex gap-2 mt-4 md:mt-0">
                             {(canManage) && (
                                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium flex items-center">
                                    <Calendar className="w-4 h-4 mr-2"/> Atur Jadwal
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
                                  {selectedRoom.facilities?.map((fac, idx) => (
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
                                      {(canManage) && (
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

                              {/* Software Section - Only for Laboratorium Komputer */}
                              {selectedRoom.category === 'Laboratorium Komputer' && (
                              <div className="mb-8">
                                  <div className="flex justify-between items-center mb-3">
                                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                                          <Package className="w-5 h-5 mr-2 text-purple-500"/> Software Instalasi
                                      </h3>
                                      {(canManage) && (
                                          <button 
                                              onClick={() => setEditingSoftware({ name: '', version: '', licenseType: 'Free', category: '', notes: '' })}
                                              className="text-sm text-blue-600 hover:underline font-medium"
                                          >
                                              + Tambah Software
                                          </button>
                                      )}
                                  </div>
                                  
                                  {roomSoftware.length > 0 ? (
                                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                          <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                                              <span className="text-sm font-bold text-gray-500 uppercase">Daftar Software ({roomSoftware.length} aplikasi)</span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              {roomSoftware.map((sw) => (
                                                  <div key={sw.id} className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                                      <div>
                                                          <span className="block font-medium text-gray-900 dark:text-white">{sw.name}</span>
                                                          <span className="text-xs text-gray-500">v{sw.version} • {sw.category || 'General'}</span>
                                                          {sw.licenseType && (
                                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${sw.licenseType === 'Free' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : sw.licenseType === 'Commercial' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                                  {sw.licenseType}
                                                              </span>
                                                          )}
                                                      </div>
                                                      {(canManage) && (
                                                          <div className="flex space-x-1">
                                                              <button onClick={() => setEditingSoftware(sw)} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 className="w-3 h-3"/></button>
                                                              <button onClick={() => handleDeleteSoftware(sw.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 className="w-3 h-3"/></button>
                                                          </div>
                                                      )}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-gray-500 text-sm italic">
                                          Belum ada data software. Klik "+ Tambah Software" untuk menambahkan.
                                      </div>
                                  )}
                              </div>
                              )}

                              <SoftwareForm
                                isOpen={!!editingSoftware}
                                onClose={() => setEditingSoftware(null)}
                                onSave={handleSaveSoftware}
                                initialData={editingSoftware}
                                isSaving={isSavingSoftware}
                              />
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
      const handleDownloadTemplate = async () => {
        showToast("Fitur ini sedang dalam pengembangan.", "info");
      };
      const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        showToast("Fitur ini sedang dalam pengembangan.", "info");
      };
      const handleDeleteAllComputers = async () => { showToast("Fitur ini sedang dalam pengembangan.", "info"); };

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
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 dark:text-white text-center">Formulir Peminjaman Ruangan</h2>
            <BookingForm
                rooms={rooms}
                initialRoomId={selectedRoom.id}
                showToast={showToast}
                onSuccess={() => {
                    showToast("Permohonan berhasil dikirim!", "success");
                    setViewMode('detail');
                }}
                onCancel={() => setViewMode('detail')}
            />
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
                   value={filterStatus} 
                   onChange={(e) => setFilterStatus(e.target.value as any)}
                   className="pl-3 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none cursor-pointer"
                >
                   <option value="All">Semua Status</option>
                   <option value="Tersedia">Tersedia</option>
                   <option value="Digunakan">Digunakan</option>
                </select>
                <Filter className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>

            <div className="relative">
                <select 
                   value={filterCategory} 
                   onChange={(e) => setFilterCategory(e.target.value)}
                   className="pl-3 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none cursor-pointer"
                >
                   <option value="All">Semua Kategori</option>
                   {categories.map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                </select>
                <Filter className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"/>
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

            {(canManage) && (
                <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Tambah
                </button>
            )}
        </div>
      </div>

      {filteredRooms.length > 0 ? (
        <div className="space-y-10">
          {groupedRooms.map((group) => (
            <div key={group.floor}>
              {/* Header Lantai dengan Garis Pemisah (Divider) */}
              <div 
                className="flex items-center cursor-pointer group select-none" 
                onClick={() => toggleFloor(group.floor)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-3 transition-colors group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50">
                  <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${collapsedFloors[group.floor] !== false ? '' : 'rotate-90'}`} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{group.floor}</h2>
                <div className="ml-4 flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                <span className="ml-4 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full">
                  {group.rooms.length} Ruangan
                </span>
              </div>
              
              {/* Grid Ruangan untuk Lantai Ini */}
              {collapsedFloors[group.floor] === false && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 pb-2 animate-fade-in-up">
                {group.rooms.map((room) => (
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
                    <div className="flex gap-2">
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-300">
                           Kap: {room.capacity}
                        </span>
                        {(room.computerCount && room.computerCount > 0) ? (
                            <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded dark:bg-purple-900/30 dark:text-purple-300">
                               {room.computerCount} PC
                            </span>
                        ) : null}
                    </div>
                    {room.googleCalendarUrl && (
                      <span title="Kalender Tersinkronisasi">
                        <Check className="w-4 h-4 text-green-500" />
                      </span>
                    )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">{room.description}</p>
                
                {/* Software Section - Only for Laboratorium Komputer in List View */}
                {room.category === 'Laboratorium Komputer' && roomSoftwareMap[room.id] && roomSoftwareMap[room.id].length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded flex items-center">
                            <Package className="w-3 h-3 mr-1" />
                            {roomSoftwareMap[room.id].length} Software
                        </span>
                        {roomSoftwareMap[room.id].slice(0, 2).map((sw, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                {sw.name}
                            </span>
                        ))}
                        {roomSoftwareMap[room.id].length > 2 && (
                            <span className="text-xs text-gray-400 px-2 py-1">+{roomSoftwareMap[room.id].length - 2} lainnya</span>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                    {room.facilities?.slice(0, 3).map((f, i) => (
                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{f}</span>
                    ))}
                    {(room.facilities?.length || 0) > 3 && <span className="text-xs text-gray-400 px-2 py-1">+lainnya</span>}
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                   <div className="flex space-x-2 w-full">
                      {(canManage) && (
                           <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
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
              )}
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