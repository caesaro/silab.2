import React, { useEffect, useState } from 'react';
import { ActiveStudentRequest } from '../types';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Label } from '../../components/ui/label';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle, Printer, Mail, Eye, FileText, Clock, Upload, ArrowLeft } from 'lucide-react';
import { ActiveStudentLetter } from './ActiveStudentLetter';
import { api } from '../../services/api';

export function AdminPanel() {
  const [requests, setRequests] = useState<ActiveStudentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ActiveStudentRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [signatureBase64, setSignatureBase64] = useState<string>('');
  const [stampBase64, setStampBase64] = useState<string>('');

  const fetchRequests = async () => {
    try {
      const res = await api('/api/active-student');
      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Poll every 10 seconds for new requests
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async (reqId: string) => {
    setIsProcessing(true);
    try {
      const res = await api(`/api/active-student/${reqId}/verify`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureBase64, stampBase64 })
      });
      if (res.ok) {
        await fetchRequests();
        if (selectedRequest?.id === reqId) {
          setSelectedRequest(prev => prev ? { ...prev, status: 'verified', signatureBase64, stampBase64 } : null);
        }
      }
    } catch (error) {
      console.error('Failed to verify:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEmail = async (reqId: string) => {
    setIsProcessing(true);
    try {
      const res = await api(`/api/active-student/${reqId}/send-email`, { method: 'POST' });
      if (res.ok) {
        alert('Surat berhasil dikirim ke email mahasiswa!');
        await fetchRequests();
        if (selectedRequest?.id === reqId) {
          setSelectedRequest(prev => prev ? { ...prev, status: 'sent' } : null);
        }
      }
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Menunggu</Badge>;
      case 'verified':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" /> Terverifikasi</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Mail className="w-3 h-3 mr-1" /> Terkirim</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (selectedRequest) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 print:hidden gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => {
              setSelectedRequest(null);
              setSignatureBase64('');
              setStampBase64('');
            }}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Proses Permohonan</h2>
              <p className="text-sm text-slate-500">{selectedRequest.name} ({selectedRequest.nim})</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(selectedRequest.status)}
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            {selectedRequest.status === 'pending' && (
              <Button 
                onClick={() => handleVerify(selectedRequest.id)}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Verifikasi Berkas
              </Button>
            )}
            {(selectedRequest.status === 'verified' || selectedRequest.status === 'sent') && (
              <>
                <Button variant="outline" onClick={handlePrint} className="border-slate-300">
                  <Printer className="w-4 h-4 mr-2" /> Cetak Surat
                </Button>
                <Button 
                  onClick={() => handleSendEmail(selectedRequest.id)}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Mail className="w-4 h-4 mr-2" /> Kirim ke Email User
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Transcript & Uploads (Hidden on Print) */}
          <div className="xl:col-span-5 space-y-6 print:hidden">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" /> Transkrip Nilai
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-150 w-full bg-slate-100 relative">
                  {selectedRequest.transcriptBase64 ? (
                    <iframe src={selectedRequest.transcriptBase64} className="w-full h-full border-0" title="Transkrip Nilai" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">Tidak ada lampiran</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedRequest.status === 'pending' && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b py-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" /> Upload Pengesahan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Tanda Tangan Dekan (PNG/JPG)</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 rounded-md text-sm font-medium text-slate-700 transition-colors flex items-center gap-2">
                          <Upload className="w-4 h-4" /> Pilih File
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setSignatureBase64)} />
                        </label>
                        {signatureBase64 && <span className="text-sm text-green-600 font-medium flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Terupload</span>}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Label className="text-sm font-medium text-slate-700">Cap Fakultas (PNG/JPG)</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 rounded-md text-sm font-medium text-slate-700 transition-colors flex items-center gap-2">
                          <Upload className="w-4 h-4" /> Pilih File
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, setStampBase64)} />
                        </label>
                        {stampBase64 && <span className="text-sm text-green-600 font-medium flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Terupload</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Letter Preview */}
          <div className="xl:col-span-7 print:block print:w-full print:absolute print:top-0 print:left-0 print:m-0 print:p-0">
            <Card className="shadow-sm border-slate-200 print:border-0 print:shadow-none h-full">
              <CardHeader className="bg-slate-50 border-b py-4 print:hidden">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Printer className="w-5 h-5 text-slate-600" /> Preview Surat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-slate-200/50 print:bg-white print:p-0 flex justify-center overflow-auto min-h-200">
                <ActiveStudentLetter data={{...selectedRequest, signatureBase64, stampBase64}} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:hidden">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-xl text-slate-800">Daftar Permohonan Surat Aktif Kuliah</CardTitle>
          <CardDescription>Verifikasi dan proses permohonan dari mahasiswa.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat data...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <p>Belum ada permohonan yang masuk.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nama Mahasiswa</TableHead>
                  <TableHead>NIM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="text-slate-500">
                      {format(new Date(req.createdAt), 'dd MMM yyyy HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell className="font-medium">{req.name}</TableCell>
                    <TableCell>{req.nim}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(req);
                          setSignatureBase64(req.signatureBase64 || '');
                          setStampBase64(req.stampBase64 || '');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" /> Detail & Proses
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
