import React from 'react';
import { ActiveStudentRequest } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ActiveStudentLetterProps {
  data: ActiveStudentRequest;
}

export const ActiveStudentLetter = React.forwardRef<HTMLDivElement, ActiveStudentLetterProps>(({ data }, ref) => {
  const today = format(new Date(), 'dd MMMM yyyy', { locale: id });
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const semester = currentMonth >= 7 ? 'Ganjil' : 'Genap';
  const academicYear = currentMonth >= 7 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;

  return (
    <div ref={ref} className="bg-white p-10 shadow-lg max-w-[210mm] min-h-[297mm] mx-auto text-black font-serif text-[12pt] leading-relaxed relative">
      {/* Kop Surat */}
      <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-8">
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wide">Universitas Kristen Satya Wacana</h1>
          <h2 className="text-2xl font-bold uppercase tracking-wider mt-1">Fakultas Teknologi Informasi</h2>
          <p className="text-sm mt-2">Jl. Diponegoro 52-60 Salatiga 50711 - Jawa Tengah - Indonesia</p>
          <p className="text-sm">Telp. (0298) 321212 | Email: fti@uksw.edu | Web: fti.uksw.edu</p>
        </div>
      </div>

      {/* Judul Surat */}
      <div className="text-center mb-10">
        <h3 className="text-xl font-bold underline uppercase tracking-wider">Surat Keterangan Aktif Kuliah</h3>
        <p className="mt-1">Nomor: .../FTI/AK/{format(new Date(), 'MM/yyyy')}</p>
      </div>

      {/* Isi Surat */}
      <div className="mb-6 text-justify px-4">
        <p className="mb-6">
          Yang bertanda tangan di bawah ini, Pimpinan Fakultas Teknologi Informasi Universitas Kristen Satya Wacana Salatiga, menerangkan bahwa:
        </p>

        <table className="w-full mb-6 ml-8">
          <tbody>
            <tr>
              <td className="w-40 py-2">Nama</td>
              <td className="w-4">:</td>
              <td className="font-bold">{data.name || '[Nama Mahasiswa]'}</td>
            </tr>
            <tr>
              <td className="w-40 py-2">NIM</td>
              <td className="w-4">:</td>
              <td className="font-bold">{data.nim || '[NIM Mahasiswa]'}</td>
            </tr>
            <tr>
              <td className="w-40 py-2">Program Studi</td>
              <td className="w-4">:</td>
              <td>S1 Teknik Informatika</td>
            </tr>
            <tr>
              <td className="w-40 py-2">Fakultas</td>
              <td className="w-4">:</td>
              <td>Teknologi Informasi</td>
            </tr>
          </tbody>
        </table>

        <p className="mb-6 leading-loose">
          Adalah benar mahasiswa aktif pada Fakultas Teknologi Informasi Universitas Kristen Satya Wacana Salatiga pada Semester <span className="font-bold">{semester}</span> Tahun Akademik <span className="font-bold">{academicYear}</span>.
        </p>
        
        <p className="mb-6">
          Demikian surat keterangan ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.
        </p>
      </div>

      {/* Tanda Tangan */}
      <div className="flex justify-end mt-16 px-4">
        <div className="text-center relative">
          <p className="mb-1">Salatiga, {today}</p>
          <p className="mb-24">Dekan Fakultas Teknologi Informasi</p>
          
          {/* Render Signature and Stamp here if provided */}
          {data.signatureBase64 && (
             <img src={data.signatureBase64} alt="Tanda Tangan Dekan" className="absolute bottom-12 left-1/2 -translate-x-1/2 h-24 object-contain z-10" />
          )}
          {data.stampBase64 && (
             <img src={data.stampBase64} alt="Cap Fakultas" className="absolute bottom-8 left-0 -translate-x-1/4 h-32 object-contain opacity-90 mix-blend-multiply z-0" />
          )}

          <p className="font-bold underline relative z-20">Prof. Dr. Ir. [Nama Dekan], M.Cs.</p>
          <p className="relative z-20">NIP. 19700101 200001 1 001</p>
        </div>
      </div>

      {/* Watermark/Status Indicator (Hidden when printing) */}
      {data.status === 'pending' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none print:hidden">
          <div className="text-6xl font-bold text-red-500 border-8 border-red-500 p-8 rounded-xl rotate-[-30deg]">
            DRAFT / PENDING
          </div>
        </div>
      )}
    </div>
  );
});

ActiveStudentLetter.displayName = 'ActiveStudentLetter';
