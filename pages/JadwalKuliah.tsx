import React, { useState, useEffect } from 'react';
import { Role, Room } from '../types';
import { Search, Plus, Filter, Edit, Trash2, X, Check, RefreshCw, Loader2, Users, BookOpen, Calendar, Clock, MapPin, Download, FileSpreadsheet } from 'lucide-react';
import { api } from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import SearchableSelect, { SelectOption } from '../components/SearchableSelect';
import SearchBar from '../components/SearchBar';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

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
  startDate: string;
  endDate: string;
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
  const [filterLecturer, setFilterLecturer] = useState<string>('');
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    classGroup: '-',
    dayOfWeek: 'Senin',
    startTime: '08:00',
    endTime: '10:00',
    semester: 'Ganjil',
    academicYear: '2024/2025',
    roomId: '',
    lecturerName: '',
    startDate: '', // Tanggal mulai periode semester
    endDate: ''    // Tanggal selesai periode semester
  });

  // Google Calendar API
  const googleApi = useGoogleCalendar(role, showToast);

  const getCalendarId = (input: string) => {
    if (!input) return null;
    if (!input.startsWith('http')) return input;
    try { return new URL(input).searchParams.get('src') || null; } catch (e) { return null; }
  };

  // Days options
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  
  // Semester options
  const semesters = ['Ganjil', 'Antara', 'Genap'];
  
  // Academic years
  const [academicYears, setAcademicYears] = useState<string[]>(() => {
    const defaultYears = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];
    const saved = localStorage.getItem('customAcademicYears');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...defaultYears, ...parsed])).sort((a, b) => b.localeCompare(a));
      } catch (e) {
        return defaultYears.sort((a, b) => b.localeCompare(a));
      }
    }
    return defaultYears.sort((a, b) => b.localeCompare(a));
  });

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
  }, [filterSemester, filterAcademicYear]);

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDay = filterDay === 'All' || schedule.dayOfWeek === filterDay;
    const matchesLecturer = !filterLecturer || (schedule.lecturerName && schedule.lecturerName.toLowerCase().includes(filterLecturer.toLowerCase()));
    return matchesSearch && matchesDay && matchesLecturer;
  });

  const handleOpenModal = (schedule?: ClassSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        courseCode: schedule.courseCode,
        courseName: schedule.courseName,
        classGroup: schedule.classGroup || '-',
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        semester: schedule.semester,
        academicYear: schedule.academicYear,
        roomId: schedule.roomId || '',
        lecturerName: schedule.lecturerName || '',
        startDate: schedule.startDate || '',
        endDate: schedule.endDate || ''
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        courseCode: '',
        courseName: '',
        classGroup: '-',
        dayOfWeek: 'Senin',
        startTime: '08:00',
        endTime: '10:00',
        semester: filterSemester || 'Ganjil',
        academicYear: filterAcademicYear || '2024/2025',
        roomId: '',
        lecturerName: '',
        startDate: '',
        endDate: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDownloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Jadwal Kuliah');

    worksheet.columns = [
      { header: 'courseCode', key: 'courseCode', width: 15 },
      { header: 'courseName', key: 'courseName', width: 30 },
      { header: 'dayOfWeek', key: 'dayOfWeek', width: 15 },
      { header: 'startTime', key: 'startTime', width: 15 },
      { header: 'endTime', key: 'endTime', width: 15 },
      { header: 'semester', key: 'semester', width: 15 },
      { header: 'academicYear', key: 'academicYear', width: 20 },
      { header: 'roomName', key: 'roomName', width: 25 },
      { header: 'lecturerName', key: 'lecturerName', width: 30 },
      { header: 'startDate', key: 'startDate', width: 20 },
      { header: 'endDate', key: 'endDate', width: 20 },
    ];

    worksheet.addRow({
      courseCode: "TI401",
      courseName: "Jaringan Komputer",
      dayOfWeek: "Senin",
      startTime: "08:00",
      endTime: "10:00",
      semester: "Ganjil",
      academicYear: "2024/2025",
      roomName: rooms[0]?.name || "FTI 227 (sesuaikan dengan nama ruangan yang ada di sistem)",
      lecturerName: "John Doe, M.Kom",
      startDate: "2025-08-18",
      endDate: "2025-12-12"
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_jadwal_kuliah.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      try {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
          showToast("File Excel kosong atau format salah.", "error");
          return;
        }

        const newSchedules: any[] = [];
        const unmatchedRooms = new Set<string>();
        const headers: {[key: number]: string} = {};
        
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value ? cell.value.toString() : '';
        });

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
              let cellValue = cell.value;
              if (cellValue instanceof Date) {
                if (header === 'startTime' || header === 'endTime') {
                  const hh = String(cellValue.getUTCHours()).padStart(2, '0');
                  const min = String(cellValue.getUTCMinutes()).padStart(2, '0');
                  cellValue = `${hh}:${min}`;
                } else {
                  const yyyy = cellValue.getFullYear();
                  const mm = String(cellValue.getMonth() + 1).padStart(2, '0');
                  const dd = String(cellValue.getDate()).padStart(2, '0');
                  cellValue = `${yyyy}-${mm}-${dd}`;
                }
              } else if (cellValue && typeof cellValue === 'object' && 'result' in cellValue) {
                cellValue = (cellValue as any).result;
              }
              rowData[header] = cellValue ? String(cellValue).trim() : '';
            }
          });

          if (rowData.courseCode && rowData.courseName) {
            // Pencocokan otomatis nama ruangan ke ID Ruangan
            let matchedRoomId = '';
            let isValidRoom = false;
            
            if (rowData.roomName) {
              const searchName = String(rowData.roomName).toLowerCase().trim();
              const foundRoom = rooms.find(r => r.name.toLowerCase().trim() === searchName);
              if (foundRoom) {
                matchedRoomId = foundRoom.id;
                isValidRoom = true;
              } else {
                unmatchedRooms.add(String(rowData.roomName).trim());
              }
            }

            // Hanya tambahkan jadwal jika ruangan valid dan ditemukan
            if (isValidRoom) {
              newSchedules.push({
                courseCode: rowData.courseCode,
                courseName: rowData.courseName,
                classGroup: '-',
                dayOfWeek: rowData.dayOfWeek || 'Senin',
                startTime: rowData.startTime || '08:00',
                endTime: rowData.endTime || '10:00',
                semester: rowData.semester || 'Ganjil',
                academicYear: rowData.academicYear || '2024/2025',
                roomId: matchedRoomId,
                lecturerName: rowData.lecturerName || '',
                startDate: rowData.startDate || '',
                endDate: rowData.endDate || ''
              });
            }
          }
        });

        if (newSchedules.length > 0) {
          setIsLoading(true);
          let successCount = 0;
          let errorCount = 0;

          for (const schedule of newSchedules) {
            try {
              const res = await api('/api/class-schedules', { method: 'POST', data: schedule });
              if (res.ok) {
                successCount++;
                
                if (schedule.academicYear && !academicYears.includes(schedule.academicYear)) {
                  setAcademicYears(prev => {
                    const newYears = Array.from(new Set([...prev, schedule.academicYear])).sort((a, b) => b.localeCompare(a));
                    localStorage.setItem('customAcademicYears', JSON.stringify(newYears));
                    return newYears;
                  });
                }
                
                const room = rooms.find(r => r.id === schedule.roomId);
                if (room && room.googleCalendarUrl && schedule.startDate && schedule.endDate) {
                  const calendarId = getCalendarId(room.googleCalendarUrl);
                  if (calendarId && googleApi.isGapiInitialized && googleApi.isAuthenticated) {
                    const dayMap: Record<string, number> = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
                    const targetDay = dayMap[schedule.dayOfWeek] ?? 1;
                    const semesterStart = new Date(schedule.startDate);
                    let distance = targetDay - semesterStart.getDay();
                    if (distance < 0) distance += 7;
                    const firstClassDate = new Date(semesterStart);
                    firstClassDate.setDate(semesterStart.getDate() + distance);
                    const dateStr = firstClassDate.toISOString().split('T')[0];
                    const startDateTime = new Date(`${dateStr}T${schedule.startTime}:00`);
                    const endDateTime = new Date(`${dateStr}T${schedule.endTime}:00`);
                    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    const semesterEnd = new Date(schedule.endDate);
                    semesterEnd.setUTCHours(23, 59, 59, 999);
                    const untilStr = semesterEnd.toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';
                    const eventResource = { summary: `${schedule.courseCode} ${schedule.courseName}-${schedule.lecturerName || ''}`, location: room.name, description: `Mata Kuliah: ${schedule.courseName}\nKode: ${schedule.courseCode}\nDosen: ${schedule.lecturerName || '-'}\nSemester: ${schedule.semester} ${schedule.academicYear}\n\nDiinput via CORE.FTI`, start: { dateTime: startDateTime.toISOString(), timeZone: userTimeZone }, end: { dateTime: endDateTime.toISOString(), timeZone: userTimeZone }, recurrence: [`RRULE:FREQ=WEEKLY;UNTIL=${untilStr}`] };
                    await googleApi.createEvent(calendarId, eventResource);
                  }
                }
              } else {
                errorCount++;
              }
            } catch (err) {
              errorCount++;
            }
          }

          await fetchSchedules();
          if (successCount > 0 && errorCount === 0) {
            showToast(`Berhasil mengimport ${successCount} jadwal kelas.`, "success");
          } else if (successCount > 0 && errorCount > 0) {
            showToast(`Berhasil ${successCount} jadwal. Gagal ${errorCount} jadwal.`, "warning");
          } else {
            showToast("Gagal mengimport data.", "error");
          }
          
          // Tampilkan peringatan jika ada ruangan yang tidak ditemukan
          if (unmatchedRooms.size > 0) {
            setTimeout(() => {
              showToast(`Peringatan: Beberapa jadwal ditolak karena ruangan (${Array.from(unmatchedRooms).join(', ')}) tidak ditemukan di sistem.`, "warning");
            }, 500);
          }
        } else {
          showToast("Tidak ada data valid yang diimport.", "warning");
        }
      } catch (error) {
        console.error(error);
        showToast("Gagal memproses file Excel.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const roomOptions: SelectOption[] = rooms.map(r => ({
    value: r.id,
    label: r.name,
    subLabel: r.category
  }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Waktu
    if (formData.endTime <= formData.startTime) {
      showToast('Jam selesai harus lebih besar dari jam mulai.', 'warning');
      return;
    }
    
    // Simpan tahun akademik baru ke local storage dan state jika belum ada
    if (formData.academicYear && !academicYears.includes(formData.academicYear)) {
      const updatedYears = Array.from(new Set([...academicYears, formData.academicYear])).sort((a, b) => b.localeCompare(a));
      setAcademicYears(updatedYears);
      localStorage.setItem('customAcademicYears', JSON.stringify(updatedYears));
    }
    
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
          
          // Update integrasi Google Calendar
          if (!googleApi.isGapiInitialized) {
            showToast('Google API belum siap, jadwal tersimpan namun sinkronisasi Calendar gagal.', 'warning');
          } else if (!googleApi.isAuthenticated) {
            googleApi.login();
            showToast('Mohon login ke Google untuk mensinkronkan perubahan ini ke Calendar.', 'info');
          } else {
            if (!formData.startDate || !formData.endDate) {
              showToast('Tanggal periode mulai & selesai wajib diisi untuk sinkronisasi Calendar!', 'warning');
            } else {
              // 1. Hapus event lama dari ruangan lama
              const oldRoom = rooms.find(r => r.id === editingSchedule.roomId);
              if (oldRoom && oldRoom.googleCalendarUrl) {
                const oldCalendarId = getCalendarId(oldRoom.googleCalendarUrl);
                if (oldCalendarId) {
                  try {
                    const q = `${editingSchedule.courseCode} ${editingSchedule.courseName}-${editingSchedule.lecturerName || ''}`;
                    const response = await window.gapi.client.calendar.events.list({ calendarId: oldCalendarId, q });
                    if (response.result.items && response.result.items.length > 0) {
                      await googleApi.deleteEvent(oldCalendarId, response.result.items[0].id);
                    }
                  } catch (e) {
                    console.error("Gagal hapus event lama di GCal", e);
                  }
                }
              }

              // 2. Buat event baru di ruangan baru (atau ruangan yang sama tapi jam/hari berubah)
              const newRoom = rooms.find(r => r.id === formData.roomId);
              if (newRoom && newRoom.googleCalendarUrl) {
                const newCalendarId = getCalendarId(newRoom.googleCalendarUrl);
                if (newCalendarId) {
                  try {
                    const dayMap: Record<string, number> = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
                    const targetDay = dayMap[formData.dayOfWeek] ?? 1;
                    const semesterStart = new Date(formData.startDate);
                    let distance = targetDay - semesterStart.getDay();
                    if (distance < 0) distance += 7;
                    const firstClassDate = new Date(semesterStart);
                    firstClassDate.setDate(semesterStart.getDate() + distance);
                    const dateStr = firstClassDate.toISOString().split('T')[0];
                    const startDateTime = new Date(`${dateStr}T${formData.startTime}:00`);
                    const endDateTime = new Date(`${dateStr}T${formData.endTime}:00`);
                    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    
                    const semesterEnd = new Date(formData.endDate);
                    semesterEnd.setUTCHours(23, 59, 59, 999);
                    const untilStr = semesterEnd.toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';

                    const eventResource = { summary: `${formData.courseCode} ${formData.courseName}-${formData.lecturerName || ''}`, location: newRoom.name, description: `Mata Kuliah: ${formData.courseName}\nKode: ${formData.courseCode}\nDosen: ${formData.lecturerName || '-'}\nSemester: ${formData.semester} ${formData.academicYear}\n\nDiinput via CORE.FTI`, start: { dateTime: startDateTime.toISOString(), timeZone: userTimeZone }, end: { dateTime: endDateTime.toISOString(), timeZone: userTimeZone }, recurrence: [`RRULE:FREQ=WEEKLY;UNTIL=${untilStr}`] };
                    await googleApi.createEvent(newCalendarId, eventResource);
                    showToast('Jadwal di Google Calendar telah disinkronkan.', 'info');
                  } catch (e) {
                    console.error("Gagal buat event baru di GCal", e);
                    showToast('Gagal membuat jadwal di Google Calendar ruangan.', 'error');
                  }
                }
              }
            }
          }
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
          
          // Tambah ke Google Calendar
          const room = rooms.find(r => r.id === formData.roomId);
          if (room && room.googleCalendarUrl) {
            if (!formData.startDate || !formData.endDate) {
              showToast('Tanggal periode mulai & selesai wajib diisi untuk sinkronisasi Calendar!', 'warning');
            } else {
              const calendarId = getCalendarId(room.googleCalendarUrl);
              if (calendarId) {
                if (!googleApi.isGapiInitialized) {
                  showToast('Google API belum siap, gagal sinkronisasi ke Calendar.', 'warning');
                } else if (!googleApi.isAuthenticated) {
                  googleApi.login();
                  showToast('Mohon login ke Google untuk sinkronisasi Calendar.', 'info');
                } else {
                  const dayMap: Record<string, number> = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
                  const targetDay = dayMap[formData.dayOfWeek] ?? 1;
                  const semesterStart = new Date(formData.startDate);
                  let distance = targetDay - semesterStart.getDay();
                  if (distance < 0) distance += 7;
                  const firstClassDate = new Date(semesterStart);
                  firstClassDate.setDate(semesterStart.getDate() + distance);
                  const dateStr = firstClassDate.toISOString().split('T')[0];
                  const startDateTime = new Date(`${dateStr}T${formData.startTime}:00`);
                  const endDateTime = new Date(`${dateStr}T${formData.endTime}:00`);
                  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const semesterEnd = new Date(formData.endDate);
                  semesterEnd.setUTCHours(23, 59, 59, 999);
                  const untilStr = semesterEnd.toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';
                  const eventResource = { summary: `${formData.courseCode} ${formData.courseName}-${formData.lecturerName || ''}`, location: room.name, description: `Mata Kuliah: ${formData.courseName}\nKode: ${formData.courseCode}\nDosen: ${formData.lecturerName || '-'}\nSemester: ${formData.semester} ${formData.academicYear}\n\nDiinput via CORE.FTI`, start: { dateTime: startDateTime.toISOString(), timeZone: userTimeZone }, end: { dateTime: endDateTime.toISOString(), timeZone: userTimeZone }, recurrence: [`RRULE:FREQ=WEEKLY;UNTIL=${untilStr}`] };
                  const success = await googleApi.createEvent(calendarId, eventResource);
                  if (success) showToast('Berhasil disinkronkan ke Google Calendar ruangan!', 'success');
                }
              }
            }
          }
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      showToast("Gagal menyimpan jadwal kelas.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const scheduleToDelete = schedules.find(s => s.id === id);
    if (window.confirm("Apakah Anda yakin ingin menghapus jadwal kelas ini?")) {
      try {
        await api(`/api/class-schedules/${id}`, { method: 'DELETE' });
        showToast("Jadwal kelas berhasil dihapus!", "success");
        fetchSchedules();
        
        // Hapus dari Google Calendar
        if (scheduleToDelete) {
          const room = rooms.find(r => r.id === scheduleToDelete.roomId);
          if (room && room.googleCalendarUrl && googleApi.isGapiInitialized && googleApi.isAuthenticated) {
            const calendarId = getCalendarId(room.googleCalendarUrl);
            if (calendarId) {
              try {
                const q = `${scheduleToDelete.courseCode} ${scheduleToDelete.courseName}-${scheduleToDelete.lecturerName || ''}`;
                const response = await window.gapi.client.calendar.events.list({ calendarId, q });
                const events = response.result.items;
                if (events && events.length > 0) {
                  await googleApi.deleteEvent(calendarId, events[0].id);
                  showToast('Jadwal terkait di Google Calendar juga telah dihapus.', 'info');
                }
              } catch (e) {
                console.error("Gagal hapus dari GCal", e);
                showToast('Gagal menghapus jadwal dari Google Calendar.', 'error');
              }
            }
          }
        }
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
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDownloadTemplate} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
            <Download className="w-4 h-4 mr-2" /> Template
          </button>
          <label className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105 cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Import
            <input type="file" accept=".xlsx" className="hidden" onChange={handleExcelUpload} />
          </label>
          <button onClick={() => handleOpenModal()} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm transition-all hover:scale-105">
             <Plus className="w-4 h-4 mr-2" /> Tambah Jadwal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
         <SearchBar 
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Cari kode/nama matakuliah..."
         />
         <SearchBar 
            value={filterLecturer}
            onChange={setFilterLecturer}
            placeholder="Cari nama dosen..."
         />
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
                 <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode Matakuliah</label>
                     <input 
                         type="text" required 
                         value={formData.courseCode} 
                         onChange={e => setFormData({...formData, courseCode: e.target.value.toUpperCase()})}
                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                         placeholder="Contoh: DC502"
                     />
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
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruangan</label>
                    <SearchableSelect
                        options={roomOptions}
                        value={formData.roomId}
                        onChange={val => setFormData({...formData, roomId: val})}
                        placeholder="-- Pilih Ruangan --"
                        searchPlaceholder="Cari ruangan..."
                    />
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                        <input 
                            type="text" required 
                            list="academic-years-list"
                            value={formData.academicYear}
                            onChange={e => setFormData({...formData, academicYear: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Contoh: 2024/2025"
                        />
                        <datalist id="academic-years-list">
                            {academicYears.map(ay => (
                              <option key={ay} value={ay} />
                            ))}
                        </datalist>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tgl Mulai Periode</label>
                        <input 
                            type="date" 
                            value={formData.startDate} 
                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tgl Selesai Periode</label>
                        <input 
                            type="date" 
                            value={formData.endDate} 
                            onChange={e => setFormData({...formData, endDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
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
