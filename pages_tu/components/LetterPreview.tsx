import React from 'react';
import { ObservationData } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface LetterPreviewProps {
  data: ObservationData;
}

export const LetterPreview = React.forwardRef<HTMLDivElement, LetterPreviewProps>(({ data }, ref) => {
  const today = format(new Date(), 'dd MMMM yyyy', { locale: id });

  return (
    <div ref={ref} className="bg-white p-10 shadow-lg max-w-[210mm] min-h-[297mm] mx-auto text-black font-serif text-[12pt] leading-relaxed">
      {/* Kop Surat */}
      <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wide">Universitas Kristen Satya Wacana</h1>
          <h2 className="text-2xl font-bold uppercase tracking-wider mt-1">Fakultas Teknologi Informasi</h2>
          <p className="text-sm mt-2">Jl. Diponegoro 52-60 Salatiga 50711 - Jawa Tengah - Indonesia</p>
          <p className="text-sm">Telp. (0298) 321212 | Email: fti@uksw.edu | Web: fti.uksw.edu</p>
        </div>
      </div>

      {/* Meta Surat */}
      <div className="flex justify-between mb-8">
        <div>
          <table className="text-[12pt]">
            <tbody>
              <tr>
                <td className="pr-4 py-1">Nomor</td>
                <td>: .../FTI/OBS/{format(new Date(), 'MM/yyyy')}</td>
              </tr>
              <tr>
                <td className="pr-4 py-1">Lampiran</td>
                <td>: -</td>
              </tr>
              <tr>
                <td className="pr-4 py-1">Hal</td>
                <td className="font-bold">: Permohonan Ijin Observasi</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <p>Salatiga, {today}</p>
        </div>
      </div>

      {/* Tujuan Surat */}
      <div className="mb-8">
        <p>Kepada Yth.</p>
        <p className="font-bold">{data.recipientName || '[Nama Penerima / Jabatan]'}</p>
        <p className="font-bold">{data.companyName || '[Nama Perusahaan]'}</p>
        <p>{data.companyAddress || '[Alamat Perusahaan]'}</p>
      </div>

      {/* Isi Surat */}
      <div className="mb-6 text-justify">
        <p className="mb-4">Dengan hormat,</p>
        <p className="mb-4">
          Sehubungan dengan tugas mata kuliah <span className="font-bold">{data.courseName || '[Nama Mata Kuliah]'}</span> pada program studi di lingkungan Fakultas Teknologi Informasi Universitas Kristen Satya Wacana, kami mohon bantuan Bapak/Ibu untuk dapat memberikan ijin kepada mahasiswa kami:
        </p>

        {/* Tabel Mahasiswa */}
        <table className="w-full border-collapse border border-black mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-4 py-2 w-12 text-center">No</th>
              <th className="border border-black px-4 py-2 text-left">Nama Lengkap</th>
              <th className="border border-black px-4 py-2 text-left w-48">NIM</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((student, index) => (
              <tr key={index}>
                <td className="border border-black px-4 py-2 text-center">{index + 1}</td>
                <td className="border border-black px-4 py-2">{student.name || '-'}</td>
                <td className="border border-black px-4 py-2">{student.nim || '-'}</td>
              </tr>
            ))}
            {data.students.length === 0 && (
              <tr>
                <td colSpan={3} className="border border-black px-4 py-2 text-center italic text-gray-500">
                  Data mahasiswa belum ditambahkan
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <p className="mb-4">
          Untuk melakukan kegiatan observasi dan wawancara di perusahaan/instansi yang Bapak/Ibu pimpin. Data yang diperoleh semata-mata hanya akan digunakan untuk kepentingan akademik mahasiswa yang bersangkutan.
        </p>
        <p>
          Demikian permohonan ini kami sampaikan. Atas perhatian, bantuan, dan kerjasama yang baik dari Bapak/Ibu, kami mengucapkan terima kasih.
        </p>
      </div>

      {/* Tanda Tangan */}
      <div className="flex justify-between mt-16 px-4">
        <div className="text-center">
          <p className="mb-24">Dosen Pengampu</p>
          <p className="font-bold underline">{data.lecturerName || '[Nama Dosen Pengampu]'}</p>
          <p>NIDN. {data.lecturerNidn || '[NIDN Dosen]'}</p>
        </div>
        <div className="text-center">
          <p className="mb-24">Ketua Program Studi</p>
          <p className="font-bold underline">{data.headOfProgramName || '[Nama Kaprodi]'}</p>
          <p>NIDN. {data.headOfProgramNidn || '[NIDN Kaprodi]'}</p>
        </div>
      </div>
    </div>
  );
});

LetterPreview.displayName = 'LetterPreview';
