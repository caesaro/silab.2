import React from 'react';
import { Room } from '../types';
import { Skeleton } from './Skeleton';
import { MapPin, Users, Monitor, Check, Edit2, Trash2, ChevronRight } from 'lucide-react';

interface FloorGroup {
  floor: string;
  rooms: Room[];
}

interface RoomListProps {
  filteredRooms: Room[];
  collapsedFloors: Record<string, boolean>;
  toggleFloor: (floor: string) => void;
  canManage: boolean;
  onRoomSelect: (room: Room) => void;
  onEdit: (room: Room) => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
}

const RoomList: React.FC<RoomListProps> = ({
  filteredRooms,
  collapsedFloors,
  toggleFloor,
  canManage,
  onRoomSelect,
  onEdit,
  onDelete,
  isDarkMode
}) => {
  // Group rooms by floor (memoized in parent, passed down)
  const groupedRooms: FloorGroup[] = React.useMemo(() => {
    const groups: Record<string, Room[]> = {};
    filteredRooms.forEach(room => {
      const floor = room.floor || 'Lantai 4';
      if (!groups[floor]) {
        groups[floor] = [];
      }
      groups[floor].push(room);
    });
    return Object.keys(groups).sort().map(floor => ({
      floor,
      rooms: groups[floor]
    }));
  }, [filteredRooms]);

  if (filteredRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
          <MapPin className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Tidak ada ruangan ditemukan</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Coba ubah kata kunci pencarian atau tambahkan ruangan baru jika Anda adalah admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groupedRooms.map((group) => (
        <div key={group.floor}>
          {/* Floor Header */}
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
          {collapsedFloors[group.floor] === false && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 pb-2 animate-fade-in-up">
              {group.rooms.map((room) => (
                <div 
                  key={room.id} 
                  onClick={() => onRoomSelect(room)} 
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all flex flex-col group cursor-pointer"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {room.name}
                        </h3>
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            room.category === 'Laboratorium Komputer' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                              : room.category === 'Teori' 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : room.category === 'Praktek'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                                  : room.category === 'Rekreasi'
                                    ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-200 dark:border-pink-800'
                                    : room.category === 'Meeting'
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                                      : room.category === 'Lounge'
                                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                        : room.category === 'Open Space'
                                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800'
                                          : room.category === 'Auditorium/Ruang Kuliah Umum'
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                          }`}>
                          {room.category}
                        </span>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                        <MapPin className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                    
                    <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1">
                      {room.description || "Tidak ada deskripsi ruangan."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="flex flex-col p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Users className="w-3 h-3 mr-1"/> Kapasitas</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{room.capacity} Orang</span>
                      </div>
                      {room.computerCount && room.computerCount > 0 ? (
                        <div className="flex flex-col p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Monitor className="w-3 h-3 mr-1"/> Komputer</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{room.computerCount} Unit</span>
                        </div>
                      ) : (
                        <div className="flex flex-col p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center"><Check className="w-3 h-3 mr-1"/> Kalender</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{room.googleCalendarUrl ? 'Tersinkronisasi' : 'Tidak Tersedia'}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {room.facilities?.slice(0, 3).map((f, i) => (
                        <span key={i} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600">
                          {f}
                        </span>
                      ))}
                      {(room.facilities?.length || 0) > 3 && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 px-1 py-1 font-medium">+{room.facilities!.length - 3} lainnya</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex space-x-2 w-full">
                        {canManage && (
                          <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => onEdit(room)} 
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20 transition-colors" 
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onDelete(room.id)} 
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20 transition-colors" 
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <button className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-sm font-medium rounded-lg transition-colors text-center ml-auto shadow-sm">
                          Lihat Detail
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
  );
};

export default RoomList;
