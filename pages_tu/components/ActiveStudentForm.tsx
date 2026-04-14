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
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');

  const nimValue = watch('nim');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // QR Code Upload State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      alert('Gagal membuat sesi upload via HP.');
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

  const getCurrentSemester = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    // Semester Ganjil biasanya dimulai Agustus (bulan 8).
    // Kita asumsikan Juli (7) ke atas sudah masuk TA baru semester 1 (Ganjil).
    return month >= 7 ? `${year}1` : `${year - 1}2`;
  };

  const handleVerifyKST = async () => {
    if (!nimValue) {
      setVerifyError('Silakan masukkan NIM terlebih dahulu.');
      return;
    }
    
    setIsVerifying(true);
    setVerifyError('');
    
    try {
      const semester = getCurrentSemester();
      const res = await api(`/api/siasat/kst/${nimValue}?semester=${semester}`);
      
      if (!res.ok) throw new Error('Gagal menghubungi server');
      
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        setIsVerified(true);
      } else {
        setVerifyError(`KST tidak ditemukan untuk NIM ${nimValue} pada semester ${semester}. Pastikan Anda sudah registrasi KST.`);
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
      alert('Mohon upload transkrip nilai (PDF)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
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
      alert('Terjadi kesalahan saat mengirim data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl border-0 ring-1 ring-slate-900/5 overflow-hidden text-center py-12">
        <CardContent className="space-y-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Permohonan Berhasil Dikirim!</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Permohonan Surat Keterangan Aktif Kuliah Anda telah masuk ke sistem. 
            Admin akan melakukan verifikasi dan surat akan dikirimkan ke email Anda.
          </p>
          <Button onClick={() => setSubmitSuccess(false)} className="mt-6" variant="outline">
            Buat Permohonan Baru
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto shadow-xl border-0 ring-1 ring-slate-900/5 overflow-hidden">
        <CardHeader className="bg-white border-b px-6 py-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-800 font-bold">Surat Keterangan Aktif Kuliah</CardTitle>
              <CardDescription className="text-slate-500">Isi data dan upload transkrip nilai untuk pengajuan.</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-700 font-medium">Nama Lengkap</Label>
                <Input id="name" placeholder="Masukkan nama lengkap" {...register("name", { required: true })} readOnly={isVerified} className={isVerified ? "bg-slate-50 text-slate-500" : ""} />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="nim" className="text-slate-700 font-medium">NIM</Label>
                <div className="flex gap-3">
                  <Input id="nim" placeholder="Contoh: 672019000" {...register("nim", { required: true })} readOnly={isVerified} className={isVerified ? "bg-slate-50 text-slate-500" : ""} />
                  {!isVerified && (
                    <Button type="button" onClick={handleVerifyKST} disabled={isVerifying || !nimValue} className="bg-slate-800 hover:bg-slate-900 shrink-0">
                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      {isVerifying ? '' : 'Cek KST'}
                    </Button>
                  )}
                </div>
                {verifyError && <p className="text-sm text-red-500 flex items-center mt-1"><XCircle className="w-4 h-4 mr-1" /> {verifyError}</p>}
                {isVerified && <p className="text-sm text-green-600 flex items-center mt-1 font-medium"><CheckCircle2 className="w-4 h-4 mr-1" /> KST Terverifikasi (Aktif Semester Ini)</p>}
              </div>

              {isVerified && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6 pt-6 mt-6 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email (Untuk pengiriman surat)</Label>
                <Input id="email" type="email" placeholder="nama@student.uksw.edu" {...register("email", { required: true })} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 font-medium">Upload Transkrip Nilai (PDF)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    onClick={startQrUpload}
                  >
                    <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Upload via HP
                  </Button>
                </div>
                <div className={`mt-2 flex justify-center rounded-lg border border-dashed px-6 py-8 transition-colors ${fileBase64 ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}>
                  <div className="text-center">
                    {fileBase64 ? (
                      <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                    ) : (
                      <Upload className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                    )}
                    <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                      >
                        <span>{fileBase64 ? 'Ganti file PDF' : 'Pilih file PDF'}</span>
                        <input id="file-upload" type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} />
                      </label>
                    </div>
                    <p className={`text-xs leading-5 mt-2 ${fileBase64 ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
                      {fileName ? `File terpilih: ${fileName}` : 'PDF up to 10MB'}
                    </p>
                  </div>
                </div>
              </div>

                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-base" disabled={isSubmitting}>
                    {isSubmitting ? 'Mengirim...' : (
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              {qrUrl && <QRCodeSVG value={qrUrl} size={200} />}
            </div>
            
            <div className="flex items-center text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full">
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-500" />
              Menunggu file diupload dari HP...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
