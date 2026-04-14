import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { ObservationData } from '../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, Trash2, Printer, Mail, Building2, GraduationCap, Users } from 'lucide-react';

interface ObservationFormProps {
  onDataChange: (data: ObservationData) => void;
  onPrint: () => void;
  onEmailClick: () => void;
}

export function ObservationForm({ onDataChange, onPrint, onEmailClick }: ObservationFormProps) {
  const { register, control, watch, handleSubmit, formState: { errors } } = useForm<ObservationData>({
    defaultValues: {
      recipientName: '',
      companyName: '',
      companyAddress: '',
      courseName: '',
      lecturerName: '',
      lecturerNidn: '',
      headOfProgramName: '',
      headOfProgramNidn: '',
      students: [{ name: '', nim: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "students"
  });

  // Watch for changes and pass them up
  React.useEffect(() => {
    const subscription = watch((value: any) => {
      onDataChange(value as ObservationData);
    });
    return () => subscription.unsubscribe();
  }, [watch, onDataChange]);

  return (
    <Card className="w-full shadow-xl border-0 ring-1 ring-slate-900/5 overflow-hidden">
      <CardHeader className="bg-white border-b px-6 py-5">
        <CardTitle className="text-xl text-slate-800 font-bold">Formulir Pengisian</CardTitle>
        <CardDescription className="text-slate-500">Lengkapi data di bawah ini untuk men-generate surat.</CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          
          {/* Company Details */}
          <div className="p-6 bg-slate-50/50 space-y-5">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Building2 className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Data Perusahaan Tujuan</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recipientName" className="text-slate-700 font-medium">Nama Penerima / Jabatan</Label>
                <Input id="recipientName" placeholder="Contoh: HRD Manager" className="bg-white" {...register("recipientName")} />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-slate-700 font-medium">Nama Perusahaan / Instansi</Label>
                <Input id="companyName" placeholder="Contoh: PT. Teknologi Nusantara" className="bg-white" {...register("companyName")} />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="companyAddress" className="text-slate-700 font-medium">Alamat Perusahaan</Label>
                <Input id="companyAddress" placeholder="Contoh: Jl. Sudirman No. 123, Jakarta" className="bg-white" {...register("companyAddress")} />
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div className="p-6 bg-white space-y-5">
            <div className="flex items-center gap-2 text-indigo-700 mb-2">
              <GraduationCap className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Data Akademik & Pengesahan</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="courseName" className="text-slate-700 font-medium">Nama Mata Kuliah</Label>
                <Input id="courseName" placeholder="Contoh: Rekayasa Perangkat Lunak" {...register("courseName")} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lecturerName" className="text-slate-700 font-medium">Nama Dosen Pengampu</Label>
                  <Input id="lecturerName" placeholder="Nama lengkap beserta gelar" {...register("lecturerName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lecturerNidn" className="text-slate-700 font-medium">NIDN Dosen</Label>
                  <Input id="lecturerNidn" placeholder="Nomor Induk Dosen Nasional" {...register("lecturerNidn")} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="headOfProgramName" className="text-slate-700 font-medium">Nama Kaprodi</Label>
                  <Input id="headOfProgramName" placeholder="Nama lengkap beserta gelar" {...register("headOfProgramName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="headOfProgramNidn" className="text-slate-700 font-medium">NIDN Kaprodi</Label>
                  <Input id="headOfProgramNidn" placeholder="Nomor Induk Dosen Nasional" {...register("headOfProgramNidn")} />
                </div>
              </div>
            </div>
          </div>

          {/* Student Details */}
          <div className="p-6 bg-slate-50/50 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-teal-700">
                <Users className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Anggota Kelompok</h3>
              </div>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                {fields.length} / 10
              </span>
            </div>
            
            <div className="space-y-3">
              {fields.map((field: { id: string }, index: number) => (
                <div key={field.id} className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold mt-2.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500 uppercase tracking-wider">Nama Lengkap</Label>
                      <Input placeholder="Nama Mahasiswa" {...register(`students.${index}.name` as const)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500 uppercase tracking-wider">NIM</Label>
                      <Input placeholder="672019000" {...register(`students.${index}.nim` as const)} />
                    </div>
                  </div>
                  {fields.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 mt-6"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-dashed border-2 hover:bg-slate-100 hover:text-slate-900 text-slate-500"
              onClick={() => {
                if (fields.length < 10) append({ name: '', nim: '' });
              }}
              disabled={fields.length >= 10}
            >
              <Plus className="w-4 h-4 mr-2" /> Tambah Anggota Kelompok
            </Button>
          </div>

          {/* Actions */}
          <div className="p-6 bg-white flex flex-col sm:flex-row gap-3">
            <Button onClick={onPrint} className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-sm h-11 text-base">
              <Printer className="w-4 h-4 mr-2" /> Cetak Surat (PDF)
            </Button>
            <Button onClick={onEmailClick} variant="outline" className="flex-1 h-11 text-base border-slate-300 hover:bg-slate-50">
              <Mail className="w-4 h-4 mr-2" /> Kirim via Email
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
