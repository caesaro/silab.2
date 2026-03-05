export enum Role {
  ADMIN = 'Admin',
  LABORAN = 'Laboran', // Teknisi / Admin Laboran
  USER = 'User',
}

export enum BookingStatus {
  PENDING = 'Pending',
  APPROVED = 'Disetujui',
  REJECTED = 'Ditolak',
}

export interface Room {
  id: string;
  name: string;
  category?: string;
  description: string;
  capacity: number;
  pic: string;
  image: string;
  facilities: string[];
  googleCalendarUrl?: string; // Public Embed URL
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
  rejectionReason?: string; // Alasan penolakan
}

export interface Equipment {
  id: string; // Kode FTI (Primary Key)
  ukswCode: string; // Kode UKSW
  name: string;
  category: string; // New field
  condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  isAvailable: boolean;
  serialNumber?: string;
}

export interface Loan {
  id: string;
  transactionId: string; // Grouping ID
  equipmentId: string;
  equipmentName: string;
  borrowerName: string;
  borrowOfficer: string; // Petugas Peminjaman
  returnOfficer?: string; // Petugas Pengembalian
  guarantee: string; // KTM / KTP
  borrowDate: string;
  borrowTime?: string; // Jam Peminjaman
  actualReturnDate?: string;
  actualReturnTime?: string; // Jam realisasi kembali
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
  username?: string; // New Field
  role: string;
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