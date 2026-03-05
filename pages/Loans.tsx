// Page: Loans (Peminjaman Barang)
import React, { useState, useEffect, useRef } from 'react';
import { Role, Loan, Equipment } from '../types';
import { Search, Filter, Plus, Check, X, Clock, Box, User, Save, Trash2, CreditCard, Eye, Calendar, QrCode, Camera, Zap, ZapOff } from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";
import { api } from '../services/api';

interface LoansProps {
  role: Role;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const Loans: React.FC<LoansProps> = ({ role, showToast }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{equipmentIds: string[], borrowerName: string, guarantee: string, nim: string, borrowDate: string, borrowTime: string, borrowOfficer: string}>({
    equipmentIds: [''],
    borrowerName: '',
    guarantee: 'KTM',
    nim: '',
    borrowDate: new Date().toISOString().split('T')[0], // Default hari ini
    borrowTime: new Date().toTimeString().slice(0, 5),   // Default jam sekarang
    borrowOfficer: ''
  });

  // Detail & Return Modal State
  const [selectedGroup, setSelectedGroup] = useState<{key: string, loans: Loan[]} | null>(null);
  const [returnConfirmation, setReturnConfirmation] = useState<{loans: Loan[], returnTime: string, returnDate: string, returnOfficer: string} | null>(null);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameras, setCameras] = useState<Array<{id: string, label: string}>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanningRowIndex, setScanningRowIndex] = useState<number | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef<((decodedText: string) => void) | null>(null);
  const lastScanRef = useRef<{code: string, time: number}>({code: '', time: 0});

  const handleCloseScanner = async () => {
      // Jika sedang scanning, stop dulu dengan await
      if (scannerRef.current && isScanning) {
          try {
              await scannerRef.current.stop();
          } catch (err) {
              console.warn("Error stopping scanner:", err);
          }
      }
      setIsScanning(false);
      setTorchOn(false);
      setTorchSupported(false);
      setIsScannerOpen(false); // Baru tutup modal setelah kamera mati
      setScanningRowIndex(null);
  };

  const onScanSuccess = (decodedText: string) => {
      // Cegah scan berulang pada kode yang sama dalam 2 detik
      const now = Date.now();
      if (decodedText === lastScanRef.current.code && now - lastScanRef.current.time < 2000) return;
      lastScanRef.current = { code: decodedText, time: now };
      const item = equipment.find(e => e.id === decodedText);
      
      if (item) {
          if (!item.isAvailable) {
              showToast(`Barang ${item.name} sedang dipinjam!`, "error");
              return;
          }

          // Add to form data if not exists
          setFormData(prev => {
              // Cek duplikasi di baris lain (kecuali baris yang sedang diedit)
              const isDuplicate = prev.equipmentIds.some((id, idx) => 
                  id === decodedText && (scanningRowIndex === null || idx !== scanningRowIndex)
              );

              if (isDuplicate) {
                  showToast("Barang sudah ada di daftar", "warning");
                  return prev;
              }
              
              const newIds = [...prev.equipmentIds];

              if (scanningRowIndex !== null) {
                  // Update baris spesifik
                  newIds[scanningRowIndex] = decodedText;
              } else {
                  // Scan global (tombol atas): Isi slot kosong pertama atau tambah baru
                  if (newIds.length === 1 && newIds[0] === '') {
                      newIds[0] = decodedText;
                  } else {
                      newIds.push(decodedText);
                  }
              }

              showToast(`Ditambahkan: ${item.name}`, "success");
              return { ...prev, equipmentIds: newIds };
          });

          handleCloseScanner();
      } else {
          showToast(`ID ${decodedText} tidak ditemukan`, "error");
      }
  };

  // Handle Direct Scan from URL (QR Code Entry)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanId = params.get('scan');

    if (scanId && equipment.length > 0) { // Cek equipment sudah ada
        const item = equipment.find(e => e.id === scanId);
        if (item) {
            if (item.isAvailable) {
                // Open Modal and Pre-fill
                setFormData(prev => ({
                    ...prev,
                    equipmentIds: [scanId]
                }));
                setIsModalOpen(true);
                showToast(`Barang terdeteksi: ${item.name}`, "success");
            } else {
                showToast(`Barang ${item.name} sedang dipinjam!`, "error");
            }
        } else {
            showToast(`Barang dengan ID ${scanId} tidak ditemukan.`, "error");
        }
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
    }
  }, [equipment]); // Re-run if equipment data loads

  // Keep callback ref updated to avoid stale closures in scanner
  useEffect(() => {
      onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Initialize Scanner when modal opens
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const [loansRes, eqRes] = await Promise.all([
            api('/api/loans'),
            api('/api/inventory')
        ]);
        if (loansRes.ok) setLoans(await loansRes.json());
        if (eqRes.ok) setEquipment(await eqRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {

    let timer: NodeJS.Timeout;

    if (isScannerOpen) {
        // Cek Secure Context
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
        if (!isSecure) {
             showToast("Peringatan: Kamera mungkin diblokir browser karena koneksi tidak aman (HTTP).", "warning");
        }

        // Fetch Cameras
        Html5Qrcode.getCameras().then(devices => {
             if (devices && devices.length > 0) {
                 setCameras(devices);
                 // Prefer back camera or environment
                 const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('belakang') || d.label.toLowerCase().includes('environment'));
                 setSelectedCameraId(backCam ? backCam.id : devices[0].id);
             }
        }).catch(err => {
             console.warn("Error fetching cameras", err);
             showToast("Tidak dapat mengakses kamera. Pastikan izin diberikan.", "error");
        });

        // Delay initialization to ensure DOM is ready and prevent race conditions
        timer = setTimeout(() => {
            if (!document.getElementById("reader")) return;
            
            // Cleanup previous instance if any
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) { 
                        scannerRef.current.stop().catch(() => {});
                    }
                    scannerRef.current.clear();
                } catch (e) {}
                scannerRef.current = null;
            }

            // Manual instance
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;
        }, 100);
    } else {
        setIsScanning(false);
        setTorchOn(false);
        setTorchSupported(false);
    }
    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            if (scannerRef.current.isScanning) { 
                scannerRef.current.stop().catch(() => {});
            }
            scannerRef.current.clear();
            scannerRef.current = null;
        }
    };
  }, [isScannerOpen]);

  const handleStartScan = async () => {
      if (!scannerRef.current || !selectedCameraId) return;
      
      try {
          await scannerRef.current.start(
              selectedCameraId, 
              {
                  fps: 10,
                  qrbox: 250,
                  aspectRatio: 1.0
              },
              (decodedText) => {
                  onScanSuccessRef.current?.(decodedText);
              },
              (errorMessage) => {
                  // ignore frame errors
              }
          );
          setIsScanning(true);

          // Cek dukungan Flash/Torch
          try {
              const capabilities = scannerRef.current.getRunningTrackCapabilities();
              if ('torch' in capabilities) {
                  setTorchSupported(true);
              }
          } catch (e) {
              console.warn("Torch check failed", e);
          }
      } catch (err) {
          console.error("Error starting scanner:", err);
          showToast("Gagal memulai kamera.", "error");
      }
  };

  const handleStopScan = async () => {
      if (scannerRef.current && isScanning) {
          await scannerRef.current.stop();
          setIsScanning(false);
          setTorchOn(false);
          setTorchSupported(false);
      }
  };

  const toggleTorch = async () => {
      if (!scannerRef.current || !isScanning) return;
      try {
          await scannerRef.current.applyVideoConstraints({
              advanced: [{ torch: !torchOn } as any]
          });
          setTorchOn(!torchOn);
      } catch (err) {
          console.error("Failed to toggle torch", err);
          showToast("Gagal mengubah status flash", "error");
      }
  };

  // Derived data - recalculated on every render
  const availableEquipment = equipment.filter(e => e.isAvailable);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Dipinjam': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Dikembalikan': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Terlambat': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const initiateReturn = (loansToReturn: Loan[]) => {
    const now = new Date();
    setReturnConfirmation({
        loans: loansToReturn,
        returnDate: now.toLocaleDateString('en-CA'), // YYYY-MM-DD
        returnTime: now.toTimeString().slice(0, 5),   // HH:MM format for input
        returnOfficer: ''
    });
  };

  const confirmReturn = async () => {
    if (!returnConfirmation) return;

    const { loans, returnDate, returnTime, returnOfficer } = returnConfirmation;
    
    if (!returnOfficer) {
        showToast("Nama petugas pengembalian wajib diisi.", "error");
        return;
    }

    try {
        const res = await api('/api/loans/return', {
            method: 'PUT',
            data: {
                loanIds: loans.map(l => l.id),
                returnDate, returnTime, returnOfficer
            }
        });
        if (res.ok) fetchData();
    } catch (e) { showToast("Gagal memproses pengembalian", "error"); }
  };

  const handleDeleteGroup = async (groupLoans: Loan[]) => {
    if (confirm(`Hapus riwayat peminjaman untuk ${groupLoans.length} barang ini? Data tidak dapat dikembalikan.`)) {
      try {
        await api('/api/loans/group', {
            method: 'DELETE',
            data: { loanIds: groupLoans.map(l => l.id) }
        });
        fetchData();
        showToast("Data peminjaman dihapus.", "info");
      } catch (e) { showToast("Gagal menghapus data", "error"); }
    }
  };

  const addEquipmentRow = () => {
    setFormData(prev => ({ ...prev, equipmentIds: [...prev.equipmentIds, ''] }));
  };

  const removeEquipmentRow = (index: number) => {
    if (formData.equipmentIds.length > 1) {
      setFormData(prev => ({
        ...prev,
        equipmentIds: prev.equipmentIds.filter((_, i) => i !== index)
      }));
    }
  };

  const updateEquipmentRow = (index: number, value: string) => {
    const newIds = [...formData.equipmentIds];
    newIds[index] = value;
    setFormData(prev => ({ ...prev, equipmentIds: newIds }));
  };

  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedIds = formData.equipmentIds.filter(id => id !== '');

    // Validasi
    if (selectedIds.length === 0 || !formData.borrowerName || !formData.borrowDate || !formData.borrowTime || !formData.borrowOfficer) {
      showToast("Mohon lengkapi data peminjaman.", "error");
      return;
    }

    if (formData.guarantee === 'KTM' && !formData.nim.trim()) {
       showToast("NIM wajib diisi jika jaminan adalah KTM.", "error");
       return;
    }

    try {
        const res = await api('/api/loans', {
            method: 'POST',
            data: {
                equipmentIds: selectedIds,
                borrowerName: formData.borrowerName,
                nim: formData.nim,
                guarantee: formData.guarantee,
                borrowDate: formData.borrowDate,
                borrowTime: formData.borrowTime,
                borrowOfficer: formData.borrowOfficer
            }
        });
        if (res.ok) {
            fetchData();
            showToast(`${selectedIds.length} Peminjaman berhasil dicatat.`, "success");
        }
    } catch (e) { showToast("Gagal menyimpan data", "error"); }

    setIsModalOpen(false);
    setFormData({ 
        equipmentIds: [''], 
        borrowerName: '', 
        guarantee: 'KTM', 
        nim: '', 
        borrowDate: new Date().toISOString().split('T')[0],
        borrowTime: new Date().toTimeString().slice(0, 5),
        borrowOfficer: ''
    });
  };

  const filteredLoans = loans.filter(loan => {
      const matchesSearch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            loan.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'All' || loan.status === filter;
      return matchesSearch && matchesFilter;
  });

  // Group Loans by Transaction ID (Sesuai tabel transactions di DB)
  const groupedLoans = filteredLoans.reduce((groups, loan) => {
      const key = loan.transactionId;
      if (!groups[key]) {
          groups[key] = [];
      }
      groups[key].push(loan);
      return groups;
  }, {} as Record<string, Loan[]>);

  const sortedGroupKeys = Object.keys(groupedLoans).sort((a, b) => b.localeCompare(a)); // Sort by Transaction ID Desc (TRX-Timestamp)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Peminjaman Barang</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Kelola sirkulasi peminjaman inventaris</p>
        </div>
        <button 
             onClick={() => setIsModalOpen(true)}
             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium shadow-sm transition-all hover:scale-105"
        >
              <Plus className="w-4 h-4 mr-2" /> Peminjaman Baru
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
           <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama peminjam atau barang..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm w-full dark:text-white focus:ring-2 focus:ring-blue-500"
              />
           </div>
           
           <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                className="bg-transparent text-sm border-none focus:ring-0 text-gray-600 dark:text-gray-300 cursor-pointer outline-none"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option className="bg-white dark:bg-gray-800" value="All">Semua Status</option>
                <option className="bg-white dark:bg-gray-800" value="Dipinjam">Dipinjam</option>
                <option className="bg-white dark:bg-gray-800" value="Dikembalikan">Dikembalikan</option>
              </select>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Peminjam</th>
                <th className="px-6 py-4">Waktu Pinjam</th>
                <th className="px-6 py-4">Jumlah Barang</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedGroupKeys.length > 0 ? sortedGroupKeys.map((key) => {
                const groupLoans = groupedLoans[key];
                const firstLoan = groupLoans[0];
                
                const allReturned = groupLoans.every(l => l.status === 'Dikembalikan');
                const anyLate = groupLoans.some(l => l.status === 'Terlambat');
                const displayStatus = allReturned ? 'Dikembalikan' : (anyLate ? 'Terlambat' : 'Dipinjam');

                return (
                  <tr 
                    key={key} 
                    onClick={() => setSelectedGroup({ key, loans: groupLoans })}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">{firstLoan.borrowerName}</div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mt-1">
                          Oleh: {firstLoan.borrowOfficer} | 
                          Jaminan: {firstLoan.guarantee}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white text-sm">{firstLoan.borrowDate}</div>
                        <div className="text-xs text-gray-500">{firstLoan.borrowTime}</div>
                        {allReturned && firstLoan.actualReturnDate && (
                            <div className="mt-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                                <div className="text-[10px] uppercase font-bold text-green-600 dark:text-green-400">Dikembalikan:</div>
                                <div className="text-xs text-gray-500">{firstLoan.actualReturnDate} {firstLoan.actualReturnTime} (Oleh: {firstLoan.returnOfficer})</div>
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <Box className="w-3 h-3 mr-1" /> {groupLoans.length} Barang
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center justify-center mx-auto">
                            <Eye className="w-4 h-4 mr-1" /> Detail
                        </button>
                    </td>
                  </tr>
                );
              }) : (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                       <div className="flex flex-col items-center">
                          <Box className="w-12 h-12 text-gray-300 mb-3" />
                          <p>Tidak ada data peminjaman.</p>
                       </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-blue-600" />
                    Input Peminjaman Baru
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleSubmitLoan} className="p-6 space-y-4">
                 {/* Informasi Peminjam */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Peminjam</label>
                        <div className="relative">
                           <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                           <input 
                              type="text" required
                              value={formData.borrowerName}
                              onChange={(e) => setFormData({...formData, borrowerName: e.target.value})}
                              placeholder="Nama Lengkap"
                              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                           />
                        </div>
                     </div>
                     
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Jaminan</label>
                        <select 
                            value={formData.guarantee}
                            onChange={(e) => setFormData({...formData, guarantee: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="KTM">KTM (Mahasiswa)</option>
                            <option value="KTP">KTP (Umum)</option>
                            <option value="SIM">SIM</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {formData.guarantee === 'KTM' ? 'NIM' : 
                             formData.guarantee === 'KTP' ? 'NIK' : 
                             formData.guarantee === 'SIM' ? 'No. SIM' : 
                             formData.guarantee === 'Lainnya' ? 'Nama Jaminan' : 'Nomor Identitas'}
                        </label>
                        <div className="relative">
                            <CreditCard className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" required
                                value={formData.nim}
                                onChange={(e) => setFormData({...formData, nim: e.target.value})}
                                placeholder={formData.guarantee === 'KTM' ? '6720xxxx' : formData.guarantee === 'Lainnya' ? 'Contoh: STNK / HP' : 'Nomor Identitas'}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Pinjam</label>
                        <input 
                            type="date" required
                            value={formData.borrowDate}
                            onChange={(e) => setFormData({...formData, borrowDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Pinjam</label>
                        <input 
                            type="time" required
                            value={formData.borrowTime}
                            onChange={(e) => setFormData({...formData, borrowTime: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Petugas Peminjaman</label>
                        <input 
                            type="text" required
                            value={formData.borrowOfficer}
                            onChange={(e) => setFormData({...formData, borrowOfficer: e.target.value})}
                            placeholder="Nama Petugas"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                     </div>
                 </div>

                 {/* Daftar Barang */}
                 <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Daftar Barang</label>
                        <div className="flex gap-3">
                            <button type="button" onClick={addEquipmentRow} className="text-xs text-blue-600 hover:underline flex items-center font-medium">
                                <Plus className="w-3 h-3 mr-1" /> Tambah Manual
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {formData.equipmentIds.map((selectedId, index) => (
                            <div key={index} className="flex gap-2 animate-fade-in-up">
                                <div className="relative flex-1">
                                   <Box className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                   <select 
                                      required
                                      value={selectedId}
                                      onChange={(e) => updateEquipmentRow(index, e.target.value)}
                                      className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                                   >
                                      <option value="">-- Pilih Barang --</option>
                                      {availableEquipment.map(item => (
                                         <option 
                                            key={item.id} 
                                            value={item.id}
                                            disabled={formData.equipmentIds.includes(item.id) && item.id !== selectedId}
                                         >
                                            {item.name} ({item.id})
                                         </option>
                                      ))}
                                   </select>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setScanningRowIndex(index);
                                        setIsScannerOpen(true);
                                    }}
                                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Scan QR untuk baris ini"
                                >
                                    <QrCode className="w-4 h-4" />
                                </button>
                                {formData.equipmentIds.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => removeEquipmentRow(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Hapus baris"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                 </div>

                 <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                       Batal
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center shadow-md hover:shadow-lg transition-all">
                       <Save className="w-4 h-4 mr-2" /> Simpan Data
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Scanner Modal */}
      {isScannerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up relative">
                  <button 
                    onClick={handleCloseScanner} 
                    className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-700 rounded-full p-1 text-gray-600 dark:text-gray-200 shadow-md"
                  >
                      <X className="w-5 h-5" />
                  </button>
                  <div className="p-6">
                      <h3 className="text-lg font-bold text-center mb-4 text-gray-900 dark:text-white">Scan QR Code Barang</h3>
                      
                      {/* Warning untuk koneksi HTTP (Non-Secure) */}
                      {(window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) && (
                        <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200 text-left">
                            <strong>Kamera tidak muncul?</strong><br/>
                            Browser memblokir akses kamera pada jaringan HTTP. Gunakan <strong>HTTPS</strong> atau atur <code>chrome://flags</code> pada browser HP Anda untuk mengizinkan IP ini.
                        </div>
                      )}

                      <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Kamera</label>
                          <select 
                              value={selectedCameraId}
                              onChange={(e) => setSelectedCameraId(e.target.value)}
                              disabled={isScanning}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 cursor-pointer"
                          >
                              {cameras.length === 0 && <option>Mendeteksi kamera...</option>}
                              {cameras.map(cam => (
                                  <option key={cam.id} value={cam.id}>{cam.label || `Kamera ${cam.id.slice(0,5)}...`}</option>
                              ))}
                          </select>
                      </div>

                      <div className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 min-h-[250px] border border-gray-200 dark:border-gray-700">
                          {/* Wadah khusus untuk library scanner - Jangan taruh children React di sini */}
                          <div id="reader" className="w-full h-full"></div>

                          {!isScanning && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Kamera belum aktif</p>
                              </div>
                          )}
                          {isScanning && torchSupported && (
                              <button 
                                onClick={toggleTorch}
                                className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                                title={torchOn ? "Matikan Flash" : "Nyalakan Flash"}
                              >
                                  {torchOn ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                              </button>
                          )}
                      </div>
                      
                      <div className="mt-4 flex justify-center">
                          {!isScanning ? (
                              <button 
                                onClick={handleStartScan}
                                disabled={!selectedCameraId || cameras.length === 0}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 flex items-center"
                              >
                                  <Camera className="w-4 h-4 mr-2" /> Mulai Scan
                              </button>
                          ) : (
                              <button 
                                onClick={handleStopScan}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors flex items-center"
                              >
                                  <X className="w-4 h-4 mr-2" /> Stop Scan
                              </button>
                          )}
                      </div>

                      <p className="text-xs text-center text-gray-500 mt-4">Arahkan kamera ke QR Code barang untuk menambahkan ke daftar peminjaman.</p>
                  </div>
              </div>
          </div>
      )}

      {/* Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                 <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Detail Peminjaman
                 </h3>
                 <button onClick={() => setSelectedGroup(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-6">
                  <div className="flex justify-between items-start mb-6 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                      <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Peminjam</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedGroup.loans[0].borrowerName}</p>
                          <p className="text-xs text-gray-500 mt-1">Jaminan: {selectedGroup.loans[0].guarantee}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Waktu Pinjam</p>
                          <p className="text-md font-medium text-gray-900 dark:text-white flex items-center justify-end">
                              <Calendar className="w-4 h-4 mr-1" /> {selectedGroup.loans[0].borrowDate}
                          </p>
                          <p className="text-md font-medium text-gray-900 dark:text-white flex items-center justify-end mt-1">
                              <Clock className="w-4 h-4 mr-1" /> {selectedGroup.loans[0].borrowTime || '-'}
                          </p>
                      </div>
                  </div>

                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Daftar Barang Dipinjam</h4>
                  
                  {selectedGroup.loans.filter(l => l.status === 'Dipinjam').length > 1 && (
                      <button 
                        onClick={() => initiateReturn(selectedGroup.loans.filter(l => l.status === 'Dipinjam'))}
                        className="mb-3 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm"
                      >
                          <Check className="w-4 h-4 mr-2" /> Kembalikan Semua ({selectedGroup.loans.filter(l => l.status === 'Dipinjam').length} Barang)
                      </button>
                  )}

                  <div className="space-y-3">
                      {selectedGroup.loans.map((loan) => (
                          <div key={loan.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <div className="flex items-center">
                                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                                      <Box className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                  </div>
                                  <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{loan.equipmentName}</p>
                                      <p className="text-xs text-gray-500">ID: {loan.equipmentId}</p>
                                  </div>
                              </div>
                              <div>
                                  {loan.status === 'Dipinjam' ? (
                                      <button 
                                        onClick={() => initiateReturn([loan])}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center"
                                      >
                                          <Check className="w-3 h-3 mr-1" /> Kembalikan
                                      </button>
                                  ) : (
                                      <div className="text-right">
                                         <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded inline-flex items-center mb-1" title={`Diterima oleh: ${loan.returnOfficer}`}>
                                              <Check className="w-3 h-3 mr-1" /> Dikembalikan
                                          </span>
                                          {loan.actualReturnDate && (
                                              <p className="text-xs text-gray-500">{loan.actualReturnDate} • {loan.actualReturnTime}</p>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between">
                  <button 
                    onClick={() => {
                        handleDeleteGroup(selectedGroup.loans);
                        setSelectedGroup(null);
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                  >
                      <Trash2 className="w-4 h-4 mr-1" /> Hapus Riwayat
                  </button>
                  <button onClick={() => setSelectedGroup(null)} className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-500">
                      Tutup
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {returnConfirmation && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Konfirmasi Pengembalian</h3>
                  <div className="space-y-3 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Barang</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                              {returnConfirmation.loans.length === 1 ? returnConfirmation.loans[0].equipmentName : `${returnConfirmation.loans.length} Barang Terpilih`}
                          </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Kembali</label>
                              <input 
                                type="date" required
                                value={returnConfirmation.returnDate}
                                onChange={e => setReturnConfirmation({...returnConfirmation, returnDate: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Jam Kembali</label>
                              <input 
                                type="time" required
                                value={returnConfirmation.returnTime}
                                onChange={e => setReturnConfirmation({...returnConfirmation, returnTime: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                          </div>
                          <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Petugas Pengembalian</label>
                              <input 
                                type="text" required
                                value={returnConfirmation.returnOfficer}
                                onChange={e => setReturnConfirmation({...returnConfirmation, returnOfficer: e.target.value})}
                                placeholder="Nama Petugas"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                              />
                          </div>
                      </div>
                  </div>
                  <div className="flex space-x-3">
                      <button onClick={() => setReturnConfirmation(null)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Batal</button>
                      <button 
                        disabled={!returnConfirmation.returnDate || !returnConfirmation.returnTime}
                        onClick={() => {
                            const count = returnConfirmation.loans.length;
                            confirmReturn();
                            setReturnConfirmation(null);
                            showToast(`${count} Barang berhasil dikembalikan`, "success");
                        }} 
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          Konfirmasi
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Loans;