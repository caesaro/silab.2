export enum Role {
  ADMIN = 'Admin',
  LABORAN = 'Laboran', // Teknisi / Admin Laboran
  USER = 'Mahasiswa/Dosen',
}

export enum BookingStatus {
  PENDING = 'Pending',
  APPROVED = 'Disetujui',
  REJECTED = 'Ditolak',
}

export interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pic: string;
  image: string;
  facilities: string[];
  googleCalendarId?: string; // New field for Calendar Sync
}

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  responsiblePerson: string; // New: Nama Penanggung Jawab
  contactPerson: string; // New: No HP / WA
  purpose: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  proposalFile?: string; // New: URL/Name of uploaded PDF
  status: BookingStatus;
}

export interface Equipment {
  id: string;
  name: string;
  code: string;
  category: string; // New field
  condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  isAvailable: boolean;
  image?: string; // New field
}

export interface Loan {
  id: string;
  equipmentId: string;
  equipmentName: string;
  borrowerName: string;
  officerName: string; // Petugas
  guarantee: string; // KTM / KTP
  borrowDate: string;
  returnDate: string;
  actualReturnDate?: string;
  status: 'Dipinjam' | 'Dikembalikan' | 'Terlambat';
}

export interface LabStaff {
  id: string;
  name: string;
  nim: string;
  email: string;
  phone: string;
  type: 'Teknisi' | 'Admin';
  status: 'Aktif' | 'Non-Aktif';
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'Mahasiswa' | 'Dosen' | 'Staff';
  identifier: string; // NIM or NIDN
  department: string; // Prodi / Unit
  status: 'Aktif' | 'Non-Aktif' | 'Suspended';
  lastLogin?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  isRead: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}