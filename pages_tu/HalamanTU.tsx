import React, { useState } from 'react';
import { Role, ObservationData } from '../types';
import { ActiveStudentForm } from './components/ActiveStudentForm';
import { AdminPanel } from './components/AdminPanel';
import { ObservationForm } from './components/ObservationForm';
import { LetterPreview } from './components/LetterPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText } from 'lucide-react';

interface HalamanTUProps {
  role: Role;
}

const HalamanTU: React.FC<HalamanTUProps> = ({ role }) => {
  // Tentukan apakah user memiliki hak akses sebagai Tata Usaha / Admin
  const isTUAdmin = role === Role.ADMIN || role === Role.ADMIN_TU || role === Role.USER_TU;

  // State untuk Preview Surat Observasi
  const [obsData, setObsData] = useState<ObservationData>({
    recipientName: '',
    companyName: '',
    companyAddress: '',
    courseName: '',
    lecturerName: '',
    lecturerNidn: '',
    headOfProgramName: '',
    headOfProgramNidn: '',
    students: []
  });

  const handlePrint = () => {
    window.print();
  };

  const handleEmailClick = () => {
    alert("Fitur kirim email belum diimplementasikan.");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Layanan Tata Usaha
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isTUAdmin 
              ? 'Kelola permohonan surat dan administrasi mahasiswa Fakultas Teknologi Informasi.' 
              : 'Pusat layanan administrasi dan pengajuan surat mahasiswa Fakultas Teknologi Informasi.'}
          </p>
        </div>
      </div>

      {/* Konten Utama berdasarkan Role */}
      <div className="pt-2 print:p-0">
        <Tabs defaultValue="aktif" className="flex flex-col w-full">
          <TabsList className="mb-6 print:hidden">
            <TabsTrigger value="aktif">Surat Aktif Kuliah</TabsTrigger>
            <TabsTrigger value="observasi">Surat Ijin Observasi</TabsTrigger>
          </TabsList>
          
          <TabsContent value="aktif" className="print:m-0 focus:outline-none">
            {isTUAdmin ? <AdminPanel /> : <ActiveStudentForm />}
          </TabsContent>
          
          <TabsContent value="observasi" className="print:m-0 focus:outline-none">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-5 print:hidden">
                <ObservationForm onDataChange={setObsData} onPrint={handlePrint} onEmailClick={handleEmailClick} />
              </div>
              <div className="xl:col-span-7 print:block print:w-full print:absolute print:top-0 print:left-0 print:m-0 print:p-0">
                <LetterPreview data={obsData} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HalamanTU;