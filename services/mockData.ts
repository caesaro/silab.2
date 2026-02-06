import { Room, Booking, BookingStatus, Equipment, Loan, LabStaff, AppUser, Notification } from '../types';

export const MOCK_ROOMS: Room[] = [
  {
    id: '1',
    name: 'Lab Rekayasa Perangkat Lunak',
    description: 'Laboratorium untuk pengembangan perangkat lunak, dilengkapi dengan PC high-end dan server lokal.',
    capacity: 40,
    pic: 'Bpk. Budi Santoso',
    image: 'https://pannellum.org/images/alma.jpg', // Valid 360
    facilities: ['AC', 'Projector', 'Whiteboard', '40 PC Core i7'],
    googleCalendarId: 'lab.rpl.uksw@gmail.com'
  },
  {
    id: '2',
    name: 'Lab Jaringan Komputer',
    description: 'Fasilitas praktikum jaringan dengan perangkat Cisco Router, Switch, dan server rack.',
    capacity: 30,
    pic: 'Ibu Siti Aminah',
    image: 'https://pannellum.org/images/cerro-toco-0.jpg', // Valid 360
    facilities: ['AC', 'Smart TV', 'Cisco Routers', 'Server Rack'],
    googleCalendarId: 'lab.jarkom.uksw@gmail.com'
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
    googleCalendarId: 'lab.mm.uksw@gmail.com'
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
    date: new Date().toISOString().split('T')[0],
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
    date: new Date().toISOString().split('T')[0],
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
    id: 'E1', 
    name: 'Projector Epson X1', 
    code: 'PRJ-001', 
    category: 'Elektronik',
    condition: 'Baik', 
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1535016120720-40c6874c3b1c?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'E2', 
    name: 'Kabel HDMI 10m', 
    code: 'CBL-005', 
    category: 'Aksesoris',
    condition: 'Baik', 
    isAvailable: false,
    image: 'https://images.unsplash.com/photo-1558517260-252a11b64082?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'E3', 
    name: 'DSLR Canon 600D', 
    code: 'CAM-012', 
    category: 'Multimedia',
    condition: 'Rusak Ringan', 
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'E4', 
    name: 'Arduino Uno Kit', 
    code: 'IOT-099', 
    category: 'IoT',
    condition: 'Baik', 
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&q=80&w=200'
  },
  { 
    id: 'E5', 
    name: 'Microphone Wireless', 
    code: 'AUD-002', 
    category: 'Audio',
    condition: 'Rusak Berat', 
    isAvailable: false,
    image: 'https://images.unsplash.com/photo-1574516327858-4573756eb72f?auto=format&fit=crop&q=80&w=200'
  },
];

export const MOCK_LOANS: Loan[] = [
  {
    id: 'L1',
    equipmentId: 'E2',
    equipmentName: 'Kabel HDMI 10m',
    borrowerName: 'Michael (672021005)',
    officerName: 'Bpk. Budi',
    guarantee: 'KTM',
    borrowDate: '2023-10-25',
    returnDate: '2023-10-26',
    status: 'Dipinjam',
  },
  {
    id: 'L2',
    equipmentId: 'E1',
    equipmentName: 'Projector Epson X1',
    borrowerName: 'Sarah (682020001)',
    officerName: 'Ibu Siti',
    guarantee: 'KTP',
    borrowDate: '2023-10-20',
    returnDate: '2023-10-20',
    actualReturnDate: '2023-10-20',
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