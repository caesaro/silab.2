import React, { useState, useEffect, useRef } from 'react';
import { MOCK_ROOMS, MOCK_BOOKINGS, MOCK_LAB_STAFF } from '../services/mockData';
import { Room, Role, BookingStatus, Booking } from '../types';
import { Search, MapPin, Users, Wifi, Edit2, Trash2, Calendar, Eye, Check, Plus, Upload, Loader2, ArrowUpDown, ExternalLink, FileText, User } from 'lucide-react';
import { generateRoomDescription } from '../services/geminiService';

// Declare Pannellum for TypeScript
declare global {
  interface Window {
    pannellum: any;
  }
}

interface RoomsProps {
  role: Role;
}

// Sub-component for 360 Thumbnail in List View
const Room360Thumbnail: React.FC<{ room: Room }> = ({ room }) => {
    const thumbnailRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);

    useEffect(() => {
        if (thumbnailRef.current && window.pannellum) {
            // Destroy existing viewer if exists
            if (viewerRef.current) {
                try {
                    // Pannellum doesn't always expose clean destroy on instance, 
                    // but we ensure the container is ready.
                    thumbnailRef.current.innerHTML = ''; 
                } catch(e) {}
            }

            try {
                viewerRef.current = window.pannellum.viewer(thumbnailRef.current, {
                    type: 'equirectangular',
                    panorama: room.image,
                    autoLoad: true,
                    autoRotate: -4, // Auto rotate speed
                    showControls: false, // Hide controls for cleaner look
                    draggable: false, // Disable interaction to function as preview
                    mouseZoom: false,
                    keyboardZoom: false,
                    compass: false
                });
            } catch (error) {
                console.error("Pannellum Error:", error);
            }
        }

        return () => {
             // Cleanup logic
             if (viewerRef.current) {
                 // In a real implementation we would call viewer.destroy(), 
                 // but basic pannellum JS removal is handled by React component unmount usually
             }
        };
    }, [room.image]);

    return (
        <div className="w-full h-full relative group">
            <div ref={thumbnailRef} className="w-full h-full" id={`pano-thumb-${room.id}`}></div>
            {/* Overlay to prevent interaction stealing clicks */}
            <div className="absolute inset-0 z-10 bg-transparent cursor-pointer"></div> 
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 z-20 pointer-events-none">
                 <span className="text-white text-sm font-bold flex items-center"><Eye className="w-4 h-4 mr-1"/> Detail & Fullscreen</span>
            </div>
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center z-20 pointer-events-none">
                  <MapPin className="w-3 h-3 mr-1"/> FTI Lt. 4
            </div>
        </div>
    );
};

const Rooms: React.FC<RoomsProps> = ({ role }) => {
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
    date: '', startTime: '', endTime: '', purpose: '', responsiblePerson: '', contactPerson: '', proposalFile: ''
  });
  const [bookingFile, setBookingFile] = useState<File | null>(null);

  // Pannellum Ref
  const panoramaRef = useRef<HTMLDivElement>(null);

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
        author: "SILAB FTI"
      });
    }
  }, [viewMode, selectedRoom]);

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

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingFile) {
       alert("Mohon upload surat permohonan peminjaman.");
       return;
    }
    
    // In a real app, upload logic here
    alert(`Permohonan berhasil dikirim!\nPenanggung Jawab: ${bookingForm.responsiblePerson}\nFile: ${bookingForm.proposalFile}`);
    
    // Reset and go back
    setBookingFile(null);
    setBookingForm({
        date: '', startTime: '', endTime: '', purpose: '', responsiblePerson: '', contactPerson: '', proposalFile: ''
    });
    setViewMode('list');
  };

  const handleGenerateDescription = async (room: Room) => {
      if (!confirm("Generate deskripsi baru menggunakan AI?")) return;
      const newDesc = await generateRoomDescription(room.name, room.facilities);
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, description: newDesc } : r));
  };

  // CRUD Handlers
  const handleAddNew = () => {
    // Restrict Access
    if (role !== Role.ADMIN) {
        alert("Akses Ditolak. Hanya Admin yang bisa menambah ruangan.");
        return;
    }

    setFormData({
      name: '', description: '', capacity: 0, pic: activeTechnicians[0]?.name || '', image: '', facilities: [], googleCalendarId: ''
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
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Calendar ID (untuk Sync)</label>
               <input 
                  type="text" value={formData.googleCalendarId || ''} 
                  onChange={e => setFormData({...formData, googleCalendarId: e.target.value})}
                  placeholder="contoh: c_123abc@group.calendar.google.com"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
               />
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

                              {selectedRoom.googleCalendarId && (
                                 <div className="flex items-center text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                    <Check className="w-4 h-4 mr-2" />
                                    <span>Tersinkronisasi dengan Google Calendar ({selectedRoom.googleCalendarId})</span>
                                 </div>
                              )}
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center justify-between">
                                  <span className="flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-500"/> Jadwal Ruangan</span>
                                  <span className="text-xs font-normal text-gray-500">{new Date().toLocaleString('default', { month: 'long' })}</span>
                              </h3>
                              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-semibold text-gray-500">
                                  {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map(d => <span key={d}>{d}</span>)}
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                  {getDaysInMonth().map(d => (
                                      <div key={d} className={`aspect-square flex items-center justify-center rounded-md text-sm transition-colors cursor-pointer hover:ring-2 hover:ring-blue-400 ${isBooked(d) ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}>
                                          {d}
                                      </div>
                                  ))}
                              </div>
                              <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                                  <div className="flex items-center"><div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div> Terpakai</div>
                                  <div className="flex items-center"><div className="w-2 h-2 border border-gray-400 rounded-full mr-1"></div> Kosong</div>
                              </div>
                              {selectedRoom.googleCalendarId && (
                                  <a href="#" className="block mt-4 text-center text-xs text-blue-600 hover:underline flex items-center justify-center">
                                      Buka di Google Calendar <ExternalLink className="w-3 h-3 ml-1" />
                                  </a>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal</label>
                          <input type="date" required 
                              value={bookingForm.date} 
                              onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Mulai</label>
                          <input type="time" required 
                              value={bookingForm.startTime} 
                              onChange={e => setBookingForm({...bookingForm, startTime: e.target.value})}
                              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                          <input type="time" required 
                              value={bookingForm.endTime} 
                              onChange={e => setBookingForm({...bookingForm, endTime: e.target.value})}
                              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" 
                          />
                       </div>
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
                      <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center">
                          <Check className="w-4 h-4 mr-2" /> Kirim Permohonan
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
                  {room.googleCalendarId && (
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