import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, SwitchCamera, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EmbeddedQRScannerProps {
  onScan: (tableNumber: number) => void;
}

export function EmbeddedQRScanner({ onScan }: EmbeddedQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScannedRef = useRef(false);

  const startScanner = async () => {
    if (!containerRef.current || hasScannedRef.current) return;
    
    setError(null);
    setIsScanning(true);

    try {
      // Clean up existing scanner if any
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // Ignore
        }
        scannerRef.current = null;
      }

      const html5QrCode = new Html5Qrcode('embedded-qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
        },
        (decodedText) => {
          if (hasScannedRef.current) return;
          
          // Parse QR code URL to extract table number
          const tableMatch = decodedText.match(/[?&]table=(\d+)/) || 
                            decodedText.match(/\/table\/(\d+)/);
          
          if (tableMatch) {
            const tableNum = parseInt(tableMatch[1]);
            if (tableNum > 0) {
              hasScannedRef.current = true;
              html5QrCode.stop().then(() => {
                onScan(tableNum);
              }).catch(() => {
                onScan(tableNum);
              });
            }
          } else {
            toast.error('Invalid QR code');
          }
        },
        () => {
          // Ignore errors during scanning
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Camera access denied');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    await stopScanner();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const retry = async () => {
    hasScannedRef.current = false;
    await startScanner();
  };

  useEffect(() => {
    startScanner();
    
    return () => {
      stopScanner();
    };
  }, [facingMode]);

  return (
    <div className="relative w-full max-w-xs mx-auto">
      {/* Scanner container */}
      <div className="relative rounded-2xl overflow-hidden bg-black/50 aspect-square">
        <div 
          id="embedded-qr-reader" 
          ref={containerRef}
          className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
        />
        
        {/* Scanning frame overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-48 h-48 relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-amber-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-amber-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-amber-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-amber-400 rounded-br-lg" />
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
            <Camera className="w-10 h-10 text-white/50 mb-3" />
            <p className="text-white/80 text-sm text-center mb-3">{error}</p>
            <Button onClick={retry} size="sm" variant="outline" className="text-white border-white/30">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Loading indicator */}
        {isScanning && !error && (
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 text-white/70">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Scanning...</span>
          </div>
        )}
      </div>

      {/* Camera switch button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={switchCamera}
        className="absolute top-2 right-2 text-white hover:bg-white/20 h-8 w-8 p-0"
      >
        <SwitchCamera className="w-4 h-4" />
      </Button>
    </div>
  );
}
