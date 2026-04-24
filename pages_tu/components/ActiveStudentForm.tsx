import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { GraduationCap, Upload, Send, CheckCircle2, Smartphone, Loader2, Search, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../services/api';

export function ActiveStudentForm() {
  const { register, handleSubmit, watch, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');

const nimValue = watch('nim');
  const [studentName, setStudentName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // QR Code Upload State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormFeedback(null);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startQrUpload = async () => {
    try {
      setFormFeedback(null);
      const res = await api('/api/upload-session', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setQrSessionId(json.sessionId);
        setQrUrl(`${window.location.origin}?uploadSession=${json.sessionId}`);
        setIsQrModalOpen(true);
        setIsPolling(true);
      }
    } catch (error) {
      console.error('Failed to start QR session:', error);
      setFormFeedback({ type: 'error', message: 'Gagal membuat sesi upload via HP. Coba lagi beberapa saat lagi.' });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && qrSessionId) {
      interval = setInterval(async () => {
        try {
          const res = await api(`/api/upload-session/${qrSessionId}`);
          const json = await res.json();
          if (json.success && json.data.status === 'completed') {
            setFileBase64(json.data.fileBase64);
            setFileName(json.data.fileName);
            setFormFeedback({ type: 'success', message: `File ${json.data.fileName} berhasil diterima dari HP.` });
            setIsPolling(false);
            setIsQrModalOpen(false);
            setQrSessionId(null);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPolling, qrSessionId]);

  const handleVerifyKST = async () => {
    if (!nimValue) {
      setVerifyError('Silakan masukkan NIM terlebih dahulu.');
      return;
    }
    
    setIsVerifying(true);
    setVerifyError('');
    
    try {
      const res = await api(`/api/siasat/kst/${nimValue}`);
      
      if (!res.ok) throw new Error('Gagal menghubungi server');
      
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setIsVerified(true);
        // Fetch student name
        try {
          const nameRes = await api(`/api/siasat/mahasiswa/${nimValue}`);
          const nameJson = await nameRes.json();
          if (nameJson.success && nameJson.data && nameJson.data.length > 0) {
            setStudentName(nameJson.data[0].nama || '-');
          }
        } catch (nameError) {
          console.error('Failed to fetch student name:', nameError);
        }
      } else {
        const semesterLabel = json.semester?.label || json.semester?.semesterCode || 'semester berjalan';
        setVerifyError(`KST tidak ditemukan untuk NIM ${nimValue} pada ${semesterLabel}. Pastikan Anda sudah registrasi KST.`);
      }
    } catch (error) {
      console.error(error);
      setVerifyError('Terjadi kesalahan saat memverifikasi KST. Coba lagi nanti.');
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (!fileBase64) {
      setFormFeedback({ type: 'error', message: 'Mohon unggah transkrip nilai dalam format PDF sebelum mengajukan permohonan.' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);
    try {
      const payload = {
        name: studentName,
        nim: data.nim,
        email: data.email,
        transcriptBase64: fileBase64,
        transcriptName: fileName
      };

      const response = await api('/api/active-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSubmitSuccess(true);
        reset();
        setFileName('');
        setFileBase64('');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormFeedback({ type: 'error', message: 'Terjadi kesalahan saat mengirim data. Silakan coba lagi.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl border-0 ring-1 ring-slate-900/5 dark:ring-gray-700 overflow-hidden text-center py-12">
        <CardContent className="space-y-4 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Permohonan Berhasil Dikirim!</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Permohonan Surat Keterangan Aktif Kuliah Anda telah masuk ke sistem. 
            Admin akan melakukan verifikasi dan surat akan dikirimkan ke email Anda.
          </p>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
            Pastikan email yang Anda masukkan aktif agar surat bisa diterima tanpa hambatan.
          </div>
          <Button onClick={() => setSubmitSuccess(false)} className="mt-6 border-slate-300 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800" variant="outline">
            Buat Permohonan Baru
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto shadow-xl border-0 ring-1 ring-slate-900/5 dark:ring-gray-700 overflow-hidden">
        <CardHeader className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-800 dark:text-white font-bold">Surat Keterangan Aktif Kuliah</CardTitle>
              <CardDescription className="text-slate-500 dark:text-gray-400">Isi data dan upload transkrip nilai untuk pengajuan.</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {formFeedback && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${
                formFeedback.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300'
              }`}>
                {formFeedback.message}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className={`rounded-2xl border px-4 py-3 ${isVerified ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Langkah 1</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-white">Verifikasi KST</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Masukkan NIM lalu cek apakah mahasiswa aktif pada semester berjalan.</p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${isVerified ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Langkah 2</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-white">Lengkapi Data</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Setelah lolos verifikasi, isi email dan unggah transkrip nilai PDF.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Langkah 3</p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-white">Ajukan Permohonan</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sistem akan menyimpan pengajuan dan admin TU akan memprosesnya.</p>
              </div>
            </div>

            <div className="space-y-4">

              
              <div className="space-y-1.5">
                <Label htmlFor="nim" className="text-slate-700 dark:text-slate-300 font-medium">NIM</Label>
                <div className="flex gap-3">
                  <Input id="nim" placeholder="Contoh: 672019000" {...register("nim", { required: true })} readOnly={isVerified} className={isVerified ? "bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400" : ""} />
                  {!isVerified && (
                    <Button type="button" onClick={handleVerifyKST} disabled={isVerifying || !nimValue} className="shrink-0 bg-blue-600 hover:bg-blue-700">
                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      {isVerifying ? 'Memeriksa...' : 'Cek KST'}
                    </Button>
                  )}
                </div>
                {!isVerified && !verifyError && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verifikasi ini memastikan mahasiswa memiliki KST pada semester berjalan sebelum surat diajukan.
                  </p>
                )}
                {verifyError && <p className="text-sm text-red-500 flex items-center mt-1"><XCircle className="w-4 h-4 mr-1" /> {verifyError}</p>}
{isVerified && (
  <>
    <p className="text-sm text-green-600 flex items-center mt-1 font-medium"><CheckCircle2 className="w-4 h-4 mr-1" /> KST Terverifikasi (Aktif Semester Ini)</p>
    {studentName && (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl dark:bg-blue-950/30 dark:border-blue-800">
        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nama Mahasiswa</Label>
        <p className="mt-1 text-slate-800 dark:text-white font-medium">{studentName}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Diambil dari data SIASAT</p>
      </div>
    )}
  </>
)}
              </div>

              {isVerified && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6 pt-6 mt-6 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
                    Verifikasi berhasil. Lengkapi email dan unggah transkrip nilai untuk melanjutkan pengajuan.
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">Email (Untuk pengiriman surat)</Label>
                    <Input id="email" type="email" placeholder="nama@student.uksw.edu" {...register("email", { required: true })} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-700 dark:text-slate-300 font-medium">Upload Transkrip Nilai (PDF)</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-8 border-slate-300 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={startQrUpload}
                      >
                        <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Upload via HP
                      </Button>
                    </div>
                    <div className={`mt-2 flex justify-center rounded-lg border border-dashed px-6 py-8 transition-colors ${fileBase64 ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                      <div className="text-center">
                        {fileBase64 ? (
                          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                        ) : (
                          <Upload className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                        )}
                        <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                          >
                            <span>{fileBase64 ? 'Ganti file PDF' : 'Pilih file PDF'}</span>
                            <input id="file-upload" type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                          </label>
                        </div>
                        <p className={`text-xs leading-5 mt-2 ${fileBase64 ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
                          {fileName ? `File terpilih: ${fileName}` : 'File PDF hingga 10 MB'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base" disabled={isSubmitting}>
                    {isSubmitting ? 'Mengirim Permohonan...' : (
                      <>
                        <Send className="w-4 h-4 mr-2" /> Ajukan Permohonan
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={isQrModalOpen} onOpenChange={(open: boolean) => {
        setIsQrModalOpen(open);
        if (!open) setIsPolling(false);
      }}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Upload via HP</DialogTitle>
            <DialogDescription className="text-center">
              Scan QR code di bawah ini menggunakan kamera HP Anda untuk mengupload file transkrip nilai langsung dari HP.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-6 space-y-6">
            <div className="bg-white dark:bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              {qrUrl && <QRCodeSVG value={qrUrl} size={200} />}
            </div>
            
            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full">
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-500" />
              Menunggu file diupload dari HP...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
