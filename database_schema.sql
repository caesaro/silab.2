-- ==========================================
-- SKEMA DATABASE SILAB FTI (PostgreSQL)
-- ==========================================

-- 1. Tabel Users
-- Menyimpan data semua pengguna (Mahasiswa, Dosen, Admin, Teknisi)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,          -- Primary Key (bisa UUID atau String ID)
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),               -- Hash password untuk login
    role VARCHAR(20) NOT NULL,           -- Enum: 'ADMIN', 'USER', 'LABORAN', 'TEKNISI'
    identifier VARCHAR(50),              -- NIM atau NIDN
    department VARCHAR(100),             -- Program Studi / Unit
    phone VARCHAR(20),                   -- Nomor Telepon/WA (dari Profile)
    address TEXT,                        -- Alamat Domisili (dari Profile)
    avatar_image BYTEA,                  -- Foto Profil (Binary Data)
    status VARCHAR(20) DEFAULT 'Aktif',  -- 'Aktif', 'Non-Aktif', 'Suspended'
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Rooms
-- Menyimpan data ruangan laboratorium
CREATE TABLE rooms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    capacity INT NOT NULL,
    pic VARCHAR(100),                    -- Nama Penanggung Jawab (bisa teks atau relasi ke users)
    image_url TEXT,                      -- URL gambar 360 atau thumbnail
    facilities TEXT[],                   -- Array of Strings (Fitur khas PostgreSQL)
    google_calendar_url TEXT,            -- Public Embed URL Google Calendar
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Bookings
-- Transaksi peminjaman ruangan
-- Relasi: Many-to-One ke Rooms, Many-to-One ke Users
CREATE TABLE bookings (
    id VARCHAR(50) PRIMARY KEY,
    room_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,        -- User yang melakukan booking
    
    responsible_person VARCHAR(100) NOT NULL, -- Nama Penanggung Jawab Kegiatan
    contact_person VARCHAR(50) NOT NULL,      -- No HP/WA
    purpose TEXT NOT NULL,                    -- Keperluan/Nama Kegiatan
    
    status VARCHAR(20) DEFAULT 'PENDING',     -- 'PENDING', 'APPROVED', 'REJECTED'
    proposal_file BYTEA,                      -- File PDF (Binary Data)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Definisi Foreign Keys
    CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3b. Tabel Booking Schedules (Detail Jadwal)
-- Menyimpan detail hari dan jam untuk satu booking (bisa multi-hari)
CREATE TABLE booking_schedules (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(50) NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    CONSTRAINT fk_schedule_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- 4. Tabel Equipment
-- Data barang inventaris
CREATE TABLE equipment (
    id VARCHAR(50) PRIMARY KEY,          -- Kode FTI (Primary Key)
    uksw_code VARCHAR(50),               -- Kode Universitas UKSW
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),                -- Elektronik, Aksesoris, dll
    condition VARCHAR(20) DEFAULT 'Baik',-- 'Baik', 'Rusak Ringan', 'Rusak Berat'
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Loans
-- Transaksi peminjaman barang
-- Relasi: Many-to-One ke Equipment
CREATE TABLE loans (
    id VARCHAR(50) PRIMARY KEY,
    equipment_id VARCHAR(50) NOT NULL,
    
    borrower_identifier VARCHAR(50) NOT NULL, -- NIM/ID Peminjam (bisa relasi ke users jika wajib login)
    borrower_name VARCHAR(100) NOT NULL,
    officer_name VARCHAR(100),                -- Petugas yang melayani
    guarantee VARCHAR(50),                    -- Jaminan (KTM/KTP)
    
    borrow_date DATE NOT NULL,
    borrow_time TIME,                         -- Jam Peminjaman
    actual_return_date DATE,                  -- Tanggal realisasi kembali
    actual_return_time TIME,                  -- Jam realisasi kembali
    status VARCHAR(20) DEFAULT 'Dipinjam',    -- 'Dipinjam', 'Dikembalikan', 'Terlambat'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Definisi Foreign Key
    -- Menggunakan RESTRICT agar barang tidak bisa dihapus sembarangan jika masih ada history peminjaman
    CONSTRAINT fk_loan_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT
);

-- Indexing untuk performa pencarian
CREATE INDEX idx_booking_schedules_date ON booking_schedules(schedule_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_equipment_uksw_code ON equipment(uksw_code);
-- Indexing untuk Foreign Keys (Mempercepat JOIN)
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_loans_equipment_id ON loans(equipment_id);
