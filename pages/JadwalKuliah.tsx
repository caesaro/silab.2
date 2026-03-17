import React, { useState, useEffect } from 'react';
import { Role, Room } from '../types';
import { Search, Plus, Filter, Edit, Trash2, X, Check, RefreshCw, Loader2, Users, BookOpen, Calendar, Clock, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';

interface ClassSchedule {
  id: string;
  courseCode: string;
  courseName: string;
  classGroup: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  semester: string;
  academicYear: string;
  roomId: string;
  roomName: string;
  lecturerName: string;
}

interface ClassScheduleManagementProps {
  role: Role;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const JadwalKuliah: React.FC<ClassScheduleManagementProps> = ({ role, showToast }) => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState<string>('All');
  const [filterSemester, setFilterSemester] = useState<string>('');
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    classGroup: '',
    dayOfWeek: 'Senin',
    startTime: '08:00',
    endTime: '10:00',
    semester: 'Ganjil',
    academicYear: '2024/2025',
    roomId: '',
    lecturerName: ''
  });

  // Days options
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  
  // Semester options
  const semesters = ['Ganjil', 'Genap'];
  
  // Academic years
  const academicYears = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSemester) params.append('semester', filterSemester);
      if (filterAcademicYear) params.append('academicYear', filterAcademicYear);
      
      const response = await api(`/api/class-schedules?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error("Error fetching class schedules:", error);
      showToast("Gagal memuat jadwal kelas", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api('/api/rooms?exclude_image=true');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchRooms();
  }, [filterSemester, filterAcademicYear]);

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.lecturerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = filterDay === 'All' || schedule.dayOfWeek === filterDay;
    return matchesSearch && matchesDay;
  });

  const handleOpenModal = (schedule?: ClassSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        courseCode: schedule.courseCode,
        courseName: schedule.courseName,
        classGroup: schedule.classGroup,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        semester: schedule.semester,
        academicYear: schedule.academicYear,
        roomId: schedule.roomId || '',
        lecturerName: schedule.lecturerName || ''
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        courseCode: '',
        courseName: '',
        classGroup: '',
        dayOfWeek: 'Senin',
        startTime: '08:00',
        endTime: '10:00',
        semester: filterSemester || 'Ganjil',
        academicYear: filterAcademicYear || '2024/2025',
        roomId: '',
        lecturerName: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        // Update
        const res = await api(`/api/class-schedules/${editingSchedule.id}`, {
          method: 'PUT',
          data: formData
        });
        if (res.ok) {
          showToast("Jadwal kelas berhasil diperbarui!", "success");
          fetchSchedules();
        }
      } else {
        // Create
        const res = await api('/api/class-schedules', {
          method: 'POST',
          data: formData
        });
        if (res.ok) {
          showToast("Jadwal kelas berhasil ditambahkan!", "success");
          fetchSchedules();
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      showToast("Gagal menyimpan jadwal kelas.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus jadwal kelas ini?")) {
      try {
        await api(`/api/class-schedules/${id}`, { method: 'DELETE' });
        showToast("Jadwal kelas berhasil dihapus!", "success");
        fetchSchedules();
      } catch (error) {
        showToast("Gagal menghapus jadwal kelas.", "error");
      }
    }
  };

  // Group schedules by day for display
  const groupedByDay = days.reduce((acc, day) => {
    acc[day] = filteredSchedules.filter(s => s.dayOfWeek === day);
    return acc;
  }, {} as Record<string, ClassSchedule[]>);

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal Kuliah</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola jadwal mata kuliah per semester</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
           <Plus className="w-4 h-4 mr-2" /> Tambah Jadwal
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
         <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari kode/nama matakuliah..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
            />
         </div>
         <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
             <button 
                onClick={fetchSchedules} 
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Data"
             >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
             </button>
             
             <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Semester:</span>
                <select 
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="">Semua Semester</option>
                    {semesters.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                </select>
             </div>
             
             <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Thn Akademik:</span>
                <select 
                    value={filterAcademicYear}
                    onChange={(e) => setFilterAcademicYear(e.target.value)}
                    className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="">Semua Tahun</option>
                    {academicYears.map(ay => (
                      <option key={ay} value={ay}>{ay}</option>
                    ))}
                </select>
             </div>
             
             <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Hari:</span>
                <select 
                    value={filterDay}
                    onChange={(e) => setFilterDay(e.target.value)}
                    className="px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                    <option value="All">Semua Hari</option>
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                </select>
             </div>
         </div>
      </div>

      {/* Schedule Cards by Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map(day => {
          const daySchedules = groupedByDay[day] || [];
          if (filterDay !== 'All' && filterDay !== day) return null;
          
          return (
            <div key={day} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-blue-600 dark:bg-blue-700 px-4 py-3">
                <h3 className="font-bold text-white">{day}</h3>
                <p className="text-blue-100 text-xs">{daySchedules.length} matakuliah</p>
              </div>
              <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
                {daySchedules.length > 0 ? daySchedules.map(schedule => (
                  <div key={schedule.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{schedule.courseCode}</span>
                        <span className="text-xs text-gray-500 ml-2">({schedule.classGroup})</span>
                      </div>
                      <div className="flex space-x-1">
                        <button onClick={() => handleOpenModal(schedule)} className="p-1 text-blue-600 hover:bg-blue-100 rounded dark:hover:bg-blue-900/30">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDelete(schedule.id)} className="p-1 text-red-600 hover:bg-red-100 rounded dark:hover:bg-red-900/30">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1 line-clamp-2">{schedule.courseName}</p>
                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                      {schedule.roomName && (
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {schedule.roomName}
                        </div>
                      )}
                      {schedule.lecturerName && (
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {schedule.lecturerName}
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Tidak ada jadwal</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-full sm:max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up max-h-[90vh] flex flex-col">
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                 <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                    {editingSchedule ? 'Edit Jadwal Kuliah' : 'Tambah Jadwal Kuliah'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleSave} className="p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode Matakuliah</label>
                        <input 
                            type="text" required 
                            value={formData.courseCode} 
                            onChange={e => setFormData({...formData, courseCode: e.target.value.toUpperCase()})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                            placeholder="TI401"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kelompok</label>
                        <input 
                            type="text" required 
                            value={formData.classGroup} 
                            onChange={e => setFormData({...formData, classGroup: e.target.value.toUpperCase()})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="A"
                        />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Matakuliah</label>
                    <input 
                        type="text" required 
                        value={formData.courseName} 
                        onChange={e => setFormData({...formData, courseName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Jaringan Komputer"
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hari</label>
                        <select 
                            value={formData.dayOfWeek}
                            onChange={e => setFormData({...formData, dayOfWeek: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            {days.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruangan</label>
                        <select 
                            value={formData.roomId}
                            onChange={e => setFormData({...formData, roomId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-</option>
                            {rooms.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Mulai</label>
                        <input 
                            type="time" required 
                            value={formData.startTime} 
                            onChange={e => setFormData({...formData, startTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Selesai</label>
                        <input 
                            type="time" required 
                            value={formData.endTime} 
                            onChange={e => setFormData({...formData, endTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                        <select 
                            value={formData.semester}
                            onChange={e => setFormData({...formData, semester: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            {semesters.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tahun Akademik</label>
                        <select 
                            value={formData.academicYear}
                            onChange={e => setFormData({...formData, academicYear: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            {academicYears.map(ay => (
                              <option key={ay} value={ay}>{ay}</option>
                            ))}
                        </select>
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dosen Pengampu</label>
                    <input 
                        type="text" 
                        value={formData.lecturerName} 
                        onChange={e => setFormData({...formData, lecturerName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Nama Dosen"
                    />
                 </div>

                 <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                       Batal
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all">
                       <Check className="w-4 h-4 mr-2" /> Simpan
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default JadwalKuliah;
