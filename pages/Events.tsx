import React, { useState, useEffect, useRef } from 'react';
import { Booking, BookingStatus, Room } from '../types';
import { Search, Calendar, Clock, MapPin, User, Share2, Download, X, Wrench, Info, CalendarDays } from 'lucide-react';
import { api } from '../services/api';
import html2canvas from 'html2canvas';
import nocLogo from "../src/assets/noc.png";

interface EventsProps {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

// Extend Booking type locally to include tech support fields if they exist in backend response
interface BookingWithTech extends Booking {
  techSupportPic?: string[];
  techSupportPicName?: string;
  techSupportNeeds?: string;
}

const Events: React.FC<EventsProps> = ({ showToast }) => {
  const [events, setEvents] = useState<BookingWithTech[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<BookingWithTech | null>(null);
  
  // Share Config State (Checkboxes for PNG)
  const [shareConfig, setShareConfig] = useState({
    title: true,
    time: true,
    location: true,
    pic: true,
    contact: false,
    tech: false,
    needs: false
  });

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bkRes, rmRes] = await Promise.all([
          api('/api/bookings'),
          api('/api/rooms')
        ]);
        
        if (bkRes.ok) {
          const allBookings: BookingWithTech[] = await bkRes.json();
          // Filter only approved bookings for "Events"
          setEvents(allBookings.filter(b => b.status === BookingStatus.APPROVED));
        }
        if (rmRes.ok) setRooms(await rmRes.json());
      } catch (e) {
        console.error(e);
        showToast("Gagal memuat data acara", "error");
      }
    };
    fetchData();
  }, []);

  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const filteredEvents = events.filter(e => 
    e.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadImage = async () => {
    if (!ticketRef.current) return;
    
    try {
        showToast("Sedang membuat gambar...", "info");
        const canvas = await html2canvas(ticketRef.current, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `Event_${selectedEvent?.purpose.substring(0, 20).replace(/\s+/g, '_')}.png`;
        link.click();
        showToast("Gambar berhasil didownload!", "success");
    } catch (error) {
        console.error("Gagal membuat gambar", error);
        showToast("Gagal membuat gambar.", "error");
    }
  };

  const toggleConfig = (key: keyof typeof shareConfig) => {
    setShareConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
       {/* Header & Search */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daftar Acara</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Jadwal kegiatan dan acara di Fakultas Teknologi Informasi</p>
        </div>
        <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
                type="text" 
                placeholder="Cari acara..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 w-full dark:text-white"
            />
        </div>
      </div>

      {/* Event List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map(event => (
            <div 
                key={event.id} 
                onClick={() => setSelectedEvent(event)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all cursor-pointer group"
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                        <CalendarDays className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                        Confirmed
                    </span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {event.purpose}
                </h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{event.date}, {event.startTime} - {event.endTime}</span>
                    </div>
                    <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{getRoomName(event.roomId)}</span>
                    </div>
                    <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{event.responsiblePerson}</span>
                    </div>
                </div>
            </div>
        ))}
        {filteredEvents.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                    <CalendarDays className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Belum ada acara</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                    Belum ada kegiatan yang dijadwalkan atau disetujui saat ini.
                </p>
            </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up flex flex-col md:flex-row max-h-[90vh]">
                
                {/* Left Side: Controls & Info */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white">Detail Acara</h3>
                        <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Informasi Utama</h4>
                            <p className="font-bold text-lg text-gray-900 dark:text-white mb-1">{selectedEvent.purpose}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center mt-2">
                                <Calendar className="w-4 h-4 mr-2" /> {selectedEvent.date}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center mt-1">
                                <Clock className="w-4 h-4 mr-2" /> {selectedEvent.startTime} - {selectedEvent.endTime}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center mt-1">
                                <MapPin className="w-4 h-4 mr-2" /> {getRoomName(selectedEvent.roomId)}
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Kontak & Penanggung Jawab</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">PJ:</span> {selectedEvent.responsiblePerson}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">Kontak:</span> {selectedEvent.contactPerson}</p>
                        </div>

                        {(selectedEvent.techSupportPicName || selectedEvent.techSupportNeeds) && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Technical Support</h4>
                                {selectedEvent.techSupportPicName && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">PIC:</span> {selectedEvent.techSupportPicName}</p>
                                )}
                                {selectedEvent.techSupportNeeds && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-medium">Kebutuhan:</span> {selectedEvent.techSupportNeeds}</p>
                                )}
                            </div>
                        )}

                        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center">
                                <Share2 className="w-4 h-4 mr-2" /> Bagikan Informasi (PNG)
                            </h4>
                            <p className="text-xs text-gray-500 mb-3">Pilih informasi yang ingin ditampilkan pada gambar:</p>
                            
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={shareConfig.title} onChange={() => toggleConfig('title')} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-gray-700 dark:text-gray-300">Nama Acara</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={shareConfig.time} onChange={() => toggleConfig('time')} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-gray-700 dark:text-gray-300">Waktu</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={shareConfig.location} onChange={() => toggleConfig('location')} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-gray-700 dark:text-gray-300">Lokasi</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={shareConfig.pic} onChange={() => toggleConfig('pic')} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-gray-700 dark:text-gray-300">Penanggung Jawab</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={shareConfig.contact} onChange={() => toggleConfig('contact')} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-gray-700 dark:text-gray-300">Kontak Person</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={shareConfig.tech} onChange={() => toggleConfig('tech')} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-gray-700 dark:text-gray-300">Info Teknis</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={shareConfig.needs} onChange={() => toggleConfig('needs')} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-gray-700 dark:text-gray-300">Kebutuhan Alat</span>
                                </label>
                            </div>

                            <button 
                                onClick={handleDownloadImage}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center shadow-sm"
                            >
                                <Download className="w-4 h-4 mr-2" /> Download PNG
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Preview */}
                <div className="w-full md:w-1/2 bg-gray-100 dark:bg-gray-900 p-6 flex items-center justify-center overflow-hidden relative min-h-[400px]">
                    <div className="absolute top-4 left-4 bg-white/80 dark:bg-black/50 px-2 py-1 rounded text-xs font-bold backdrop-blur-sm z-10">
                        Preview Gambar
                    </div>
                    
                    {/* The Card to Capture */}
                    <div ref={ticketRef} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-200 relative overflow-hidden">
                        {/* Decorative Header */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                        
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <img src={nocLogo} alt="Logo" className="w-10 h-10 object-contain" />
                                <div>
                                    <h1 className="text-lg font-bold text-gray-900 leading-tight">CORE.FTI</h1>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Event Card</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {shareConfig.title && (
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Nama Acara</p>
                                    <h2 className="text-xl font-bold text-gray-800 leading-snug">{selectedEvent.purpose}</h2>
                                </div>
                            )}

                            {(shareConfig.time || shareConfig.location) && (
                                <div className="grid grid-cols-1 gap-4">
                                    {shareConfig.time && (
                                        <div className="flex items-start">
                                            <div className="bg-blue-50 p-2 rounded-lg mr-3">
                                                <Calendar className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Waktu Pelaksanaan</p>
                                                <p className="text-sm font-bold text-gray-900">{selectedEvent.date}</p>
                                                <p className="text-sm text-gray-700">{selectedEvent.startTime} - {selectedEvent.endTime}</p>
                                            </div>
                                        </div>
                                    )}
                                    {shareConfig.location && (
                                        <div className="flex items-start">
                                            <div className="bg-purple-50 p-2 rounded-lg mr-3">
                                                <MapPin className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Lokasi</p>
                                                <p className="text-sm font-bold text-gray-900">{getRoomName(selectedEvent.roomId)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(shareConfig.pic || shareConfig.contact) && (
                                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                    {shareConfig.pic && (
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Penanggung Jawab</p>
                                            <p className="text-sm font-medium text-gray-800">{selectedEvent.responsiblePerson}</p>
                                        </div>
                                    )}
                                    {shareConfig.contact && (
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Kontak</p>
                                            <p className="text-sm font-medium text-gray-800">{selectedEvent.contactPerson}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(shareConfig.tech || shareConfig.needs) && (
                                <div className="pt-4 border-t border-gray-100 bg-gray-50 -mx-8 px-8 pb-4 -mb-8 mt-2">
                                    <div className="pt-4 space-y-3">
                                        {shareConfig.tech && selectedEvent.techSupportPicName && (
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center"><Wrench className="w-3 h-3 mr-1"/> Tech Support</p>
                                                <p className="text-sm font-medium text-gray-800">{selectedEvent.techSupportPicName}</p>
                                            </div>
                                        )}
                                        {shareConfig.needs && selectedEvent.techSupportNeeds && (
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center"><Info className="w-3 h-3 mr-1"/> Kebutuhan</p>
                                                <p className="text-sm text-gray-700 italic">{selectedEvent.techSupportNeeds}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer Watermark */}
                        <div className="absolute bottom-2 right-4 opacity-10">
                            <img src={nocLogo} className="w-24 h-24" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Events;