import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Zap, ZapOff } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  autoClose?: boolean; // If true, closes after successful scan
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Scan QR Code"
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  useEffect(() => {
    if (isOpen) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            const backCam = devices.find(d =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('belakang') ||
              d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        })
        .catch(err => {
          console.warn("Error fetching cameras", err);
        });
    }

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => { });
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleStartScan = async () => {
    if (!selectedCameraId) return;

    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        selectedCameraId,
        { fps: 10, qrbox: 250, aspectRatio: 1.0 },
        (decodedText) => {
          const now = Date.now();
          // Prevent duplicate scans within 2 seconds
          if (decodedText === lastScanRef.current.code && now - lastScanRef.current.time < 2000) return;
          lastScanRef.current = { code: decodedText, time: now };
          onScanSuccess(decodedText);
          handleStopScan();
        },
        () => { }
      );
      setIsScanning(true);

      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if ('torch' in capabilities) {
          setTorchSupported(true);
        }
      } catch (e) { }
    } catch (err) {
      console.error("Error starting scanner:", err);
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
      console.error(err);
    }
  };

  const handleClose = async () => {
    if (scannerRef.current && isScanning) {
      try { await scannerRef.current.stop(); } catch (e) { }
    }
    setIsScanning(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-700 rounded-full p-1 text-gray-600 dark:text-gray-200 shadow-md"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-6">
          <h3 className="text-lg font-bold text-center mb-4 text-gray-900 dark:text-white">{title}</h3>

          {/* HTTP Warning */}
          {(window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) && (
            <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200 text-left">
              <strong>Kamera tidak muncul?</strong><br />
              Browser memblokir akses kamera pada jaringan HTTP. Gunakan <strong>HTTPS</strong> atau akses via localhost.
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
                <option key={cam.id} value={cam.id}>{cam.label || `Kamera ${cam.id.slice(0, 5)}...`}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 min-h-[250px] border border-gray-200 dark:border-gray-700">
            <div id="qr-reader" className="w-full h-full"></div>
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Kamera belum aktif</p>
              </div>
            )}
            {isScanning && torchSupported && (
              <button onClick={toggleTorch} className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm" title={torchOn ? "Matikan Flash" : "Nyalakan Flash"}>
                {torchOn ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              </button>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            {!isScanning ? (
              <button onClick={handleStartScan} disabled={!selectedCameraId || cameras.length === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 flex items-center">
                <Camera className="w-4 h-4 mr-2" /> Mulai Scan
              </button>
            ) : (
              <button onClick={handleStopScan} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors flex items-center">
                <X className="w-4 h-4 mr-2" /> Stop Scan
              </button>
            )}
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            Arahkan kamera ke QR Code untuk memindai.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;

