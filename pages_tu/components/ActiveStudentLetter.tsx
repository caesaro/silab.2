import React from 'react';
import { ActiveStudentRequest, LetterLayout } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ActiveStudentLetterProps {
  data: ActiveStudentRequest & {
    backgroundImageBase64?: string;
    layout?: LetterLayout;
  };
}

export const ActiveStudentLetter = React.forwardRef<HTMLDivElement, ActiveStudentLetterProps>(({ data }, ref) => {
  const today = format(new Date(), 'dd MMMM yyyy', { locale: id });
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const semester = data.semesterName || (currentMonth >= 7 ? 'Ganjil' : 'Genap');
  const academicYear = data.academicYear || (currentMonth >= 7 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`);
  const letterNumber = data.letterNumber || `AUTO/FTI/S.Ket/${format(new Date(), 'MM/yyyy')}`;
  const layout = data.layout || { marginTopMm: 40, marginRightMm: 22, marginBottomMm: 26, marginLeftMm: 22 };

  return (
    <div
      ref={ref}
      className="relative mx-auto h-[297mm] w-[210mm] overflow-hidden bg-white font-serif text-[11pt] leading-[1.75] text-black shadow-lg"
    >
      {data.backgroundImageBase64 ? (
        <img
          src={data.backgroundImageBase64}
          alt="Background Surat Aktif Kuliah"
          className="absolute inset-0 h-full w-full object-fill"
        />
      ) : null}

      <div
        className="pointer-events-none absolute border border-dashed border-sky-400/40 print:hidden"
        style={{
          top: `${layout.marginTopMm}mm`,
          right: `${layout.marginRightMm}mm`,
          bottom: `${layout.marginBottomMm}mm`,
          left: `${layout.marginLeftMm}mm`
        }}
      />

      <div
        className="relative z-10"
        style={{
          paddingTop: `${layout.marginTopMm}mm`,
          paddingRight: `${layout.marginRightMm}mm`,
          paddingBottom: `${layout.marginBottomMm}mm`,
          paddingLeft: `${layout.marginLeftMm}mm`
        }}
      >
        <div className="mb-[7mm] text-center">
          <h3 className="text-[15pt] font-bold uppercase tracking-[0.08em] underline underline-offset-4">
            Surat Keterangan
          </h3>
        </div>

        <table className="mb-[8mm] w-full border-collapse text-[10.5pt]">
          <tbody>
            <tr>
              <td className="w-[22mm] py-[1mm] align-top">Nomor</td>
              <td className="w-[4mm] py-[1mm] align-top">:</td>
              <td className="py-[1mm] align-top">{letterNumber}</td>
            </tr>
            <tr>
              <td className="py-[1mm] align-top">Lamp</td>
              <td className="py-[1mm] align-top">:</td>
              <td className="py-[1mm] align-top">1 lembar</td>
            </tr>
            <tr>
              <td className="py-[1mm] align-top">Hal</td>
              <td className="py-[1mm] align-top">:</td>
              <td className="py-[1mm] align-top font-bold">Permohonan Surat Aktif Kuliah</td>
            </tr>
          </tbody>
        </table>

        <div className="space-y-[5mm] text-justify">
          <p>Pimpinan Fakultas Teknologi Informasi Universitas Kristen Satya Wacana, dengan ini menerangkan bahwa:</p>

          <table className="ml-[12mm] w-[calc(100%-12mm)] border-collapse">
            <tbody>
              <tr>
                <td className="w-[48mm] py-[1.1mm] align-top">Nama Mahasiswa</td>
                <td className="w-[5mm] py-[1.1mm] align-top">:</td>
                <td className="py-[1.1mm] align-top font-bold">{data.name || '[Nama Mahasiswa]'}</td>
              </tr>
              <tr>
                <td className="py-[1.1mm] align-top">NIM</td>
                <td className="py-[1.1mm] align-top">:</td>
                <td className="py-[1.1mm] align-top font-bold">{data.nim || '[NIM Mahasiswa]'}</td>
              </tr>
              <tr>
                <td className="py-[1.1mm] align-top">Jenjang Program</td>
                <td className="py-[1.1mm] align-top">:</td>
                <td className="py-[1.1mm] align-top">Sarjana</td>
              </tr>
              <tr>
                <td className="py-[1.1mm] align-top">Program Studi</td>
                <td className="py-[1.1mm] align-top">:</td>
                <td className="py-[1.1mm] align-top">Teknik Informatika</td>
              </tr>
              <tr>
                <td className="py-[1.1mm] align-top">Fakultas</td>
                <td className="py-[1.1mm] align-top">:</td>
                <td className="py-[1.1mm] align-top">Teknologi Informasi</td>
              </tr>
              <tr>
                <td className="py-[1.1mm] align-top">Universitas</td>
                <td className="py-[1.1mm] align-top">:</td>
                <td className="py-[1.1mm] align-top">Kristen Satya Wacana</td>
              </tr>
            </tbody>
          </table>

          <p>
            Benar sebagai Mahasiswa Fakultas Teknologi Informasi yang saat ini pada Semester{' '}
            <span className="font-bold">{semester}</span> Tahun Akademik <span className="font-bold">{academicYear}</span>{' '}
            terdaftar dengan status aktif kuliah.
          </p>

          <p>Demikian surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya.</p>
        </div>

        <div className="mt-[16mm] ml-auto w-[72mm]">
          <p>Salatiga, {today}</p>
          <p>Hormat kami,</p>

          <div className="relative my-[2mm] h-[34mm]">
            {data.stampBase64 && (
              <img
                src={data.stampBase64}
                alt="Cap Fakultas"
                className="absolute bottom-0 left-0 h-[30mm] object-contain opacity-90 mix-blend-multiply"
              />
            )}
            {data.signatureBase64 && (
              <img
                src={data.signatureBase64}
                alt="Tanda Tangan Dekan"
                className="absolute bottom-[6mm] left-[18mm] h-[22mm] object-contain"
              />
            )}
          </div>

          <p className="font-bold underline underline-offset-4">Prof. Ir. Daniel H.F. Manongga, M.Sc., Ph.D.</p>
          <p>Dekan</p>
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
