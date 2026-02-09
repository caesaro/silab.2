import { Room, Booking, BookingStatus, Equipment, Loan, LabStaff, AppUser, Notification } from '../types';

// Helper to get local date string YYYY-MM-DD
const getLocalISOString = () => new Date().toLocaleDateString('en-CA'); // en-CA returns YYYY-MM-DD

export const MOCK_ROOMS: Room[] = [
  {
    id: '1',
    name: 'Lab Rekayasa Perangkat Lunak 461',
    description: 'Laboratorium untuk pengembangan perangkat lunak, dilengkapi dengan PC high-end dan server lokal.',
    capacity: 40,
    pic: 'Bpk. Budi Santoso',
    image: 'https://pannellum.org/images/alma.jpg', // Valid 360
    facilities: ['AC', 'Projector', 'Whiteboard', '40 PC Core i7'],
    googleCalendarUrl: 'https://calendar.google.com/calendar/embed?src=adm.uksw.edu_i394lo68heo5ouen6eitoppqdc%40group.calendar.google.com&ctz=Asia%2FJakarta'
  },
  {
    id: '2',
    name: 'Lab Jaringan Komputer',
    description: 'Fasilitas praktikum jaringan dengan perangkat Cisco Router, Switch, dan server rack.',
    capacity: 30,
    pic: 'Ibu Siti Aminah',
    image: 'https://pannellum.org/images/cerro-toco-0.jpg', // Valid 360
    facilities: ['AC', 'Smart TV', 'Cisco Routers', 'Server Rack'],
    googleCalendarUrl: 'https://calendar.google.com/calendar/embed?src=c_3ou2lfumin3q7k32648i1gbvv0%40group.calendar.google.com&ctz=Asia%2FJakarta'
  },
  {
    id: '3',
    name: 'Lab Robotika & IoT',
    description: 'Ruang kreatif untuk perakitan robot dan pengembangan Internet of Things.',
    capacity: 25,
    pic: 'Sdr. Andi Wijaya',
    image: 'https://pannellum.org/images/bma-0.jpg', // Updated to valid 360
    facilities: ['Soldering Station', '3D Printer', 'Oscilloscope'],
  },
  {
    id: '4',
    name: 'Lab Multimedia',
    description: 'Studio untuk editing video, animasi 3D, dan desain grafis.',
    capacity: 20,
    pic: 'Ibu Sarah',
    image: 'https://pannellum.org/images/jfk.jpg', // Updated to valid 360
    facilities: ['Mac Studio', 'Green Screen', 'Sound System'],
  },
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: '101',
    roomId: '1',
    userId: '672019001',
    userName: 'John Doe',
    responsiblePerson: 'John Doe',
    contactPerson: '081234567890',
    purpose: 'Rapat HMP',
    date: getLocalISOString(),
    startTime: '10:00',
    endTime: '12:00',
    status: BookingStatus.APPROVED,
    proposalFile: 'surat_peminjaman_101.pdf'
  },
  {
    id: '102',
    roomId: '2',
    userId: '672020112',
    userName: 'Jane Smith',
    responsiblePerson: 'Jane Smith',
    contactPerson: '089876543210',
    purpose: 'Praktikum Pengganti Jarkom',
    date: getLocalISOString(),
    startTime: '13:00',
    endTime: '15:00',
    status: BookingStatus.PENDING,
    proposalFile: 'surat_permohonan_lab.pdf'
  },
  {
    id: '103',
    roomId: '3',
    userId: '672021005',
    userName: 'Michael',
    responsiblePerson: 'Michael',
    contactPerson: '081234511111',
    purpose: 'Riset Robotika',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    startTime: '09:00',
    endTime: '11:00',
    status: BookingStatus.PENDING,
  },
];

export const MOCK_EQUIPMENT: Equipment[] = [
  { 
    id: 'FTI-PRJ-001', 
    ukswCode: 'UKSW-INV-2023-001',
    name: 'Projector Epson X1', 
    category: 'Elektronik',
    condition: 'Baik', 
    isAvailable: true,
  },
  { 
    id: 'FTI-CBL-005', 
    ukswCode: 'UKSW-INV-2023-045',
    name: 'Kabel HDMI 10m', 
    category: 'Aksesoris',
    condition: 'Baik', 
    isAvailable: false,
  },
  { 
    id: 'FTI-CAM-012', 
    ukswCode: 'UKSW-INV-2022-112',
    name: 'DSLR Canon 600D', 
    category: 'Multimedia',
    condition: 'Rusak Ringan', 
    isAvailable: true,
  },
  { 
    id: 'FTI-IOT-099', 
    ukswCode: 'UKSW-INV-2023-099',
    name: 'Arduino Uno Kit', 
    category: 'IoT',
    condition: 'Baik', 
    isAvailable: true,
  },
  { 
    id: 'FTI-AUD-002', 
    ukswCode: 'UKSW-INV-2021-002',
    name: 'Microphone Wireless', 
    category: 'Audio',
    condition: 'Rusak Berat', 
    isAvailable: false,
  },
];

export const MOCK_LOANS: Loan[] = [
  {
    id: 'L1', 
    equipmentId: 'FTI-CBL-005',
    equipmentName: 'Kabel HDMI 10m',
    borrowerName: 'Michael (672021005)',
    officerName: 'Bpk. Budi',
    guarantee: 'KTM',
    borrowDate: getLocalISOString(),
    borrowTime: '09:00',
    status: 'Dipinjam',
  },
  {
    id: 'L2',
    equipmentId: 'FTI-PRJ-001',
    equipmentName: 'Projector Epson X1',
    borrowerName: 'Sarah (682020001)',
    officerName: 'Ibu Siti',
    guarantee: 'KTP',
    borrowDate: '2023-10-20',
    borrowTime: '13:30',
    actualReturnDate: '2023-10-20',
    actualReturnTime: '15:00',
    status: 'Dikembalikan',
  },
];

export const MOCK_LAB_STAFF: LabStaff[] = [
  { id: '1', name: 'Bpk. Budi Santoso', nim: '672005001', email: 'budi@uksw.edu', phone: '08123456789', type: 'Teknisi', status: 'Aktif' },
  { id: '2', name: 'Ibu Siti Aminah', nim: '682010002', email: 'siti@uksw.edu', phone: '08129876543', type: 'Admin', status: 'Aktif' },
  { id: '3', name: 'Sdr. Andi Wijaya', nim: '692015003', email: 'andi@uksw.edu', phone: '08134567890', type: 'Teknisi', status: 'Non-Aktif' },
  { id: '4', name: 'Sdr. Joko Susilo', nim: '692018881', email: 'joko@uksw.edu', phone: '08134567888', type: 'Teknisi', status: 'Aktif' },
];

export const MOCK_USERS: AppUser[] = [
  { 
    id: '1', 
    name: 'John Doe', 
    email: 'john.doe@student.uksw.edu', 
    role: 'Mahasiswa', 
    identifier: '672019001', 
    department: 'Teknik Informatika', 
    status: 'Aktif', 
    lastLogin: '2023-10-25 10:30' 
  },
  { 
    id: '2', 
    name: 'Dr. Jane Smith', 
    email: 'jane.smith@uksw.edu', 
    role: 'Dosen', 
    identifier: '0012038801', 
    department: 'Sistem Informasi', 
    status: 'Aktif', 
    lastLogin: '2023-10-24 09:15' 
  },
  { 
    id: '3', 
    name: 'Michael Johnson', 
    email: 'michael.j@student.uksw.edu', 
    role: 'Mahasiswa', 
    identifier: '682020005', 
    department: 'Desain Komunikasi Visual', 
    status: 'Suspended', 
    lastLogin: '2023-09-10 14:20' 
  },
  { 
    id: '4', 
    name: 'Sarah Connor', 
    email: 'sarah.c@student.uksw.edu', 
    role: 'Mahasiswa', 
    identifier: '672021111', 
    department: 'Teknik Informatika', 
    status: 'Non-Aktif', 
    lastLogin: '2023-01-15 08:00' 
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Peminjaman Baru',
    message: 'Jane Smith mengajukan peminjaman Lab Jarkom.',
    type: 'info',
    timestamp: '2 jam yang lalu',
    isRead: false,
  },
  {
    id: '2',
    title: 'Pengembalian Barang',
    message: 'Projector Epson X1 telah dikembalikan oleh Sarah.',
    type: 'success',
    timestamp: '1 hari yang lalu',
    isRead: true,
  }
];