import React, { useState } from 'react';
import { MOCK_ROOMS } from '../services/mockData';
import { Role } from '../types';
import { 
  Calendar, Filter, ExternalLink
} from 'lucide-react';

interface ScheduleProps {
  role: Role;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  isDarkMode: boolean;
}

const Schedule: React.FC<ScheduleProps> = ({ role, showToast, isDarkMode }) => {
  const [filterRoom, setFilterRoom] = useState(MOCK_ROOMS[0].id); // Default to first room
  
  const selectedRoom = MOCK_ROOMS.find(r => r.id === filterRoom);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal Laboratorium</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kalender pemakaian ruangan FTI UKSW</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <div className="flex items-center gap-2 w-full">
                 <Filter className="w-4 h-4 text-gray-400" />
                 <select 
                    value={filterRoom}
                    onChange={(e) => setFilterRoom(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                 >
                    {MOCK_ROOMS.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                 </select>
             </div>
         </div>
         
         {selectedRoom?.googleCalendarUrl && (
             <a 
                href={selectedRoom.googleCalendarUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center"
             >
                 Buka di Tab Baru <ExternalLink className="w-4 h-4 ml-1" />
             </a>
         )}
      </div>

      {/* Calendar Iframe */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[600px]">
         {selectedRoom?.googleCalendarUrl ? (
             <iframe 
                src={selectedRoom.googleCalendarUrl} 
                style={{border: 0, filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none'}} 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no"
             ></iframe>
         ) : (
             <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                 <Calendar className="w-16 h-16 mb-4 opacity-20" />
                 <p className="text-lg font-medium">Jadwal belum dikonfigurasi untuk ruangan ini.</p>
                 <p className="text-sm mt-2">Silakan hubungi admin untuk menambahkan URL Google Calendar.</p>
             </div>
         )}
      </div>
    </div>
  );
};

export default Schedule;