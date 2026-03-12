import React, { useState, useEffect } from 'react';
import { Room } from '../types';
import { Loader2, Upload, Check, ChevronDown, Search } from 'lucide-react';

interface RoomFormProps {
  initialData: Partial<Room>;
  isEditing: boolean;
  onSave: (formData: Partial<Room>) => void;
  onCancel: () => void;
  staffList: { id: string; name: string; jabatan: string }[];
  availableFacilities: string[];
  isSaving?: boolean;
}

const RoomForm: React.FC<RoomFormProps> = ({ initialData, isEditing, onSave, onCancel, staffList, availableFacilities, isSaving = false }) => {
  const [formData, setFormData] = useState(initialData);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [newFacilityInput, setNewFacilityInput] = useState('');
  const [currentFacilities, setCurrentFacilities] = useState(availableFacilities);
  const [isPicDropdownOpen, setIsPicDropdownOpen] = useState(false);
  const [picSearchTerm, setPicSearchTerm] = useState('');

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsImageProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
        setIsImageProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewFacility = () => {
    const newFac = newFacilityInput.trim();
    if (newFac && !currentFacilities.includes(newFac)) {
      setCurrentFacilities(prev => [...prev, newFac].sort());
      const currentRoomFacilities = formData.facilities || [];
      setFormData({ ...formData, facilities: [...currentRoomFacilities, newFac] });
      setNewFacilityInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.capacity || formData.capacity <= 0) {
      alert("Kapasitas ruangan harus lebih dari 0.");
      return;
    }
    const payload = {
      ...formData,
      facilities: formData.facilities?.filter(f => f.trim() !== '') || []
    };
    onSave(payload);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 dark:text-white">{isEditing ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Ruangan</label>
            <input type="text" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori Ruangan</label>
            <select required value={formData.category || 'Laboratorium Komputer'} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500">
              <option value="Laboratorium Komputer">Laboratorium Komputer</option>
              <option value="Teori">Teori</option>
              <option value="Praktek">Praktek</option>
              <option value="Rekreasi">Rekreasi</option>
              <option value="Meeting">Meeting</option>
              <option value="Lounge">Lounge</option>
              <option value="Open Space">Open Space</option>
              <option value="Auditorium/Ruang Kuliah Umum">Auditorium/Ruang Kuliah Umum</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kapasitas (Orang)</label>
            <input type="number" min="0" required value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
            <textarea rows={3} required value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fasilitas</label>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {currentFacilities.map((fac) => {
                  const isSelected = (formData.facilities || []).includes(fac);
                  return (
                    <button type="button" key={fac} onClick={() => {
                      const currentRoomFacilities = formData.facilities || [];
                      const newFacilities = isSelected ? currentRoomFacilities.filter(f => f !== fac) : [...currentRoomFacilities, fac];
                      setFormData({ ...formData, facilities: newFacilities });
                    }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'}`}>
                      {isSelected && <Check className="w-3 h-3 mr-1.5" />}
                      {fac}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-500">
                <input type="text" value={newFacilityInput} onChange={(e) => setNewFacilityInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewFacility(); } }} placeholder="Ketik fasilitas baru lalu Enter..." className="flex-1 px-3 py-1.5 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-500 dark:text-white" />
                <button type="button" onClick={handleAddNewFacility} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-600 text-sm font-medium rounded-md hover:bg-gray-300">Tambah</button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PIC (Penanggung Jawab)</label>
            <div className="relative">
              <div 
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer flex justify-between items-center"
                onClick={() => setIsPicDropdownOpen(!isPicDropdownOpen)}
              >
                <span className={`${!(formData as any).pic_id && !formData.pic ? 'text-gray-500' : ''}`}>
                  {(formData as any).pic_id 
                    ? staffList.find(s => s.id === (formData as any).pic_id)?.name 
                    : formData.pic || '-- Pilih PIC --'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>

              {isPicDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsPicDropdownOpen(false)}></div>
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cari staff..."
                          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
                          value={picSearchTerm}
                          onChange={(e) => setPicSearchTerm(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      <div 
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-500 text-sm"
                        onClick={() => {
                          setFormData({ ...formData, pic: '', pic_id: '' } as any);
                          setIsPicDropdownOpen(false);
                          setPicSearchTerm('');
                        }}
                      >
                        -- Tidak Ada PIC --
                      </div>
                      {staffList.filter(s => s.name.toLowerCase().includes(picSearchTerm.toLowerCase())).map((staff) => (
                        <div
                          key={staff.id}
                          className={`px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer text-sm flex justify-between items-center ${
                            (formData as any).pic_id === staff.id ? 'bg-blue-50 dark:bg-gray-700/50 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'
                          }`}
                          onClick={() => {
                            setFormData({ ...formData, pic: staff.name, pic_id: staff.id } as any);
                            setIsPicDropdownOpen(false);
                            setPicSearchTerm('');
                          }}
                        >
                          <span>{staff.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{staff.jabatan || 'Staff'}</span>
                        </div>
                      ))}
                      {staffList.filter(s => s.name.toLowerCase().includes(picSearchTerm.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-center text-gray-500 text-sm">
                          Staff tidak ditemukan
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Calendar ID</label>
            <input type="text" value={formData.googleCalendarUrl || ''} onChange={e => setFormData({ ...formData, googleCalendarUrl: e.target.value })} placeholder='Contoh: fti.laboran@adm.uksw.edu' className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Gambar 360</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              {isImageProcessing ? (
                <div className="flex flex-col items-center text-blue-600"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-sm font-semibold">Memproses...</span></div>
              ) : formData.image ? (
                <div className="flex flex-col items-center"><img src={formData.image} alt="Preview" className="h-32 object-cover rounded mb-3" /><button type="button" onClick={() => setFormData({ ...formData, image: '' })} className="text-red-500 text-sm hover:underline">Hapus Gambar</button></div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center"><Upload className="w-8 h-8 text-gray-400 mb-2" /><span className="text-sm text-gray-500">Klik untuk upload (JPG/PNG)</span><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">Batal</button>
          <button type="submit" disabled={isImageProcessing || isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoomForm;