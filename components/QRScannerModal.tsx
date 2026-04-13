import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, QrCode, Loader2, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  closeOnSuccess?: boolean;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Scan QR Code",
  closeOnSuccess = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [hasCamPermission, setHasCamPermission] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Menyimpan callback terbaru ke dalam ref agar tidak memicu re-render
  const callbacksRef = useRef({ onScanSuccess, onClose, closeOnSuccess });
  useEffect(() => {
    callbacksRef.current = { onScanSuccess, onClose, closeOnSuccess };
  }, [onScanSuccess, onClose, closeOnSuccess]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(console.warn);
      } catch (e) {
        console.warn('Scanner cleanup:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setError('');
    setHasCamPermission(false);
  }, []);

  // Close handler - FORCE camera stop
  const handleClose = useCallback(async () => {
    await stopScanner();
    callbacksRef.current.onClose();
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return; // Mencegah inisialisasi ganda
    try {
      setError('');
      setIsScanning(true);
      
      const html5QrCode = new Html5Qrcode('scanner-container');
      scannerRef.current = html5QrCode;

      // Prefer rear camera
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        throw new Error('No cameras found');
      }

      const rearCam = cameras[cameras.length - 1];
      
      await html5QrCode.start(
        rearCam.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false
        },
        (decodedText: string) => {
          callbacksRef.current.onScanSuccess(decodedText);
          if (callbacksRef.current.closeOnSuccess) {
            handleClose();
          }
        },
        (err: string) => {
          // No QR found - continue scanning
        }
      ).catch((err: any) => {
        if (err?.name === 'NotAllowedError') {
          setError('Camera access denied. Allow in browser settings.');
        } else {
          setError('Failed to start scanner: ' + (err?.message || 'Unknown error'));
        }
        setHasCamPermission(false);
        scannerRef.current = null;
      });
      
      setHasCamPermission(true);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize scanner');
      console.error('Scanner init error:', err);
      scannerRef.current = null;
    }
  }, [handleClose]);


  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      // Delay to ensure modal mounted
      const timer = setTimeout(startScanner, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Arahkan kamera ke QR code
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            aria-label="Close scanner"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 relative flex items-center justify-center p-6 bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800">
          
          <div 
            id="scanner-container" 
            className="w-full max-w-md aspect-square rounded-xl shadow-2xl bg-gray-900 overflow-hidden"
          />

          {/* Scan overlay */}
          {!error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
              <div className="w-64 h-64 border-4 border-blue-400/50 rounded-2xl p-4 bg-white/30 dark:bg-black/30 backdrop-blur-sm shadow-2xl animate-pulse">
                <div className="w-full h-full border-4 border-blue-500 rounded-xl bg-linear-to-b from-blue-400/20 to-transparent" />
              </div>
              <p className="absolute bottom-12 text-center text-white text-lg font-semibold drop-shadow-2xl">
                Scan QR Code
              </p>
              <p className="absolute bottom-6 text-white/90 text-sm font-medium drop-shadow-lg text-center max-w-xs">
                Arahkan kamera ke QR code di area biru
              </p>
            </div>
          )}

          {/* Error state */}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 rounded-xl">
              <div className="text-center space-y-4 p-8 max-w-sm">
                <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Scanner Error</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={startScanner}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all text-sm"
                  >
                    Coba Lagi
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all text-sm"
                  >
                    Input Manual
                  </button>
                </div>
              </div>
            </div>
          ) : !hasCamPermission && !isScanning ? (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 rounded-xl backdrop-blur-sm">
              <div className="text-center space-y-3 p-8">
                <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto" />
                <p className="text-white text-lg font-semibold drop-shadow-lg">Memulai Scanner</p>
                <p className="text-white/80 text-sm drop-shadow">Menunggu akses kamera...</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900/50 flex items-center gap-3">
          <button
            onClick={handleClose}
            className="px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-auto"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
