import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Smartphone } from 'lucide-react';
import { isPWA } from './Install';
import { toast } from 'sonner';
import { EmbeddedQRScanner } from '@/components/EmbeddedQRScanner';

export default function ScanTable() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useStore();
  const [showScanner, setShowScanner] = useState(true);

  // Check for table parameter from QR code scan
  const tableFromQR = searchParams.get('table');

  // Handle scan result from in-app scanner
  const handleScanResult = (tableNum: number) => {
    if (tableNum >= 1 && tableNum <= settings.tableCount) {
      // Get saved phone (persists across table sessions)
      const phoneKey = 'chiyadani:customerPhone';
      const savedPhone = localStorage.getItem(phoneKey) || '';
      
      // Create new table session with saved phone
      const sessionKey = 'chiyadani:customerActiveSession';
      localStorage.setItem(sessionKey, JSON.stringify({
        table: tableNum,
        phone: savedPhone,
        isPhoneEntered: Boolean(savedPhone),
        tableTimestamp: Date.now(),
        timestamp: Date.now()
      }));
      
      toast.success(`Table ${tableNum}`);
      navigate(`/table/${tableNum}`, { replace: true });
    } else {
      toast.error('Invalid table number');
    }
  };

  // Handle QR code scan with table number
  useEffect(() => {
    if (tableFromQR) {
      const tableNum = parseInt(tableFromQR);
      if (tableNum && tableNum >= 1 && tableNum <= settings.tableCount) {
        // Get saved phone (persists across table sessions)
        const phoneKey = 'chiyadani:customerPhone';
        const savedPhone = localStorage.getItem(phoneKey) || '';
        
        // Create new table session with saved phone
        const sessionKey = 'chiyadani:customerActiveSession';
        localStorage.setItem(sessionKey, JSON.stringify({
          table: tableNum,
          phone: savedPhone,
          isPhoneEntered: Boolean(savedPhone),
          tableTimestamp: Date.now(),
          timestamp: Date.now()
        }));
        
        toast.success(`Table ${tableNum}`);
        navigate(`/table/${tableNum}`, { replace: true });
        return;
      }
    }
  }, [tableFromQR, settings.tableCount, navigate]);

  // Check for existing session (only if no QR table parameter) - only for PWA
  useEffect(() => {
    if (tableFromQR) return; // Skip if we're processing a QR scan
    if (!isPWA()) return; // Only auto-redirect in PWA mode
    
    const sessionKey = 'chiyadani:customerActiveSession';
    const phoneKey = 'chiyadani:customerPhone';
    const existingSession = localStorage.getItem(sessionKey);
    const savedPhone = localStorage.getItem(phoneKey);
    
    if (existingSession) {
      try {
        const session = JSON.parse(existingSession) as { 
          table: number; 
          phone?: string; 
          tableTimestamp?: number;
          timestamp: number 
        };
        
        // Check if table session is still valid (4 hours)
        const tableTimestamp = session.tableTimestamp || session.timestamp;
        const tableAge = Date.now() - tableTimestamp;
        const isTableExpired = tableAge > 4 * 60 * 60 * 1000; // 4 hours
        
        if (!isTableExpired && session.table) {
          // Table session still valid, redirect to table
          setShowScanner(false);
          navigate(`/table/${session.table}`);
          return;
        }
        
        // Table expired but phone might still be saved
        if (savedPhone) {
          localStorage.setItem(phoneKey, savedPhone);
        }
        
        // Clear expired table session
        localStorage.removeItem(sessionKey);
      } catch {
        localStorage.removeItem(sessionKey);
      }
    }
  }, [navigate, tableFromQR]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex flex-col items-center justify-center p-6 text-white">
      {/* Logo */}
      <div className="mb-6 text-center">
        {settings.logo ? (
          <img 
            src={settings.logo} 
            alt={settings.restaurantName} 
            className="w-16 h-16 rounded-xl object-cover mx-auto mb-3 shadow-2xl"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-3 shadow-2xl">
            <span className="text-3xl">🍵</span>
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{settings.restaurantName}</h1>
        <p className="text-gray-400 text-sm mt-1">Digital Menu</p>
      </div>

      {/* QR Scanner */}
      {showScanner && (
        <div className="w-full max-w-sm">
          <EmbeddedQRScanner onScan={handleScanResult} />
          
          <p className="text-center text-gray-400 text-sm mt-4">
            Point camera at your table's QR code
          </p>
        </div>
      )}

      {/* PWA status indicator */}
      {isPWA() && (
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>App Mode</span>
        </div>
      )}

      {/* Non-PWA hint */}
      {!isPWA() && (
        <div className="mt-6 flex items-center gap-2 text-amber-400/70 text-xs">
          <Smartphone className="w-4 h-4" />
          <span>Install app for best experience</span>
        </div>
      )}
    </div>
  );
}
