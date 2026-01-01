import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Plug, Unplug, Check, AlertCircle, Loader2, Wifi, Usb, Settings, HelpCircle, Search, RefreshCw, Circle, AlertTriangle } from 'lucide-react';
import { dualPrinter } from '@/lib/dualPrinter';
import { networkKitchenPrinter, networkBarPrinter, NetworkPrinterConfig, discoverPrinters, DiscoveredPrinter, PrinterStatus } from '@/lib/networkPrinter';
import { receiptPrinter } from '@/lib/receiptPrinter';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';

interface PrinterConnectionUIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NetworkConfigFormProps {
  printerName: string;
  printer: typeof networkKitchenPrinter;
  discoveredPrinters: DiscoveredPrinter[];
  onConfigured: () => void;
  status: PrinterStatus | null;
  onRefreshStatus: () => void;
}

function PrinterStatusIndicator({ status }: { status: PrinterStatus | null }) {
  if (!status) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Circle className="w-2 h-2" />
        <span>Unknown</span>
      </div>
    );
  }

  if (!status.online) {
    return (
      <div className="flex items-center gap-1.5 text-destructive text-xs">
        <Circle className="w-2 h-2 fill-destructive" />
        <span>Offline</span>
      </div>
    );
  }

  if (status.paperLow) {
    return (
      <div className="flex items-center gap-1.5 text-warning text-xs">
        <AlertTriangle className="w-3 h-3" />
        <span>Low Paper</span>
      </div>
    );
  }

  if (status.coverOpen) {
    return (
      <div className="flex items-center gap-1.5 text-warning text-xs">
        <AlertTriangle className="w-3 h-3" />
        <span>Cover Open</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-success text-xs">
      <Circle className="w-2 h-2 fill-success" />
      <span>Online</span>
    </div>
  );
}

function NetworkConfigForm({ printerName, printer, discoveredPrinters, onConfigured, status, onRefreshStatus }: NetworkConfigFormProps) {
  const existingConfig = printer.getConfig();
  const [printerIp, setPrinterIp] = useState(existingConfig?.printerIp || '');
  const [printerPort, setPrinterPort] = useState(existingConfig?.printerPort?.toString() || '9100');
  const [printServerUrl, setPrintServerUrl] = useState(existingConfig?.printServerUrl || 'http://localhost:3001');
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    if (!printerIp) {
      toast.error('Please enter the printer IP address');
      return;
    }

    const config: NetworkPrinterConfig = {
      name: printerName,
      printerIp,
      printerPort: parseInt(printerPort) || 9100,
      printServerUrl,
    };

    printer.configure(config);
    toast.success(`${printerName} configured`);
    onConfigured();
    // Check status immediately after configuring
    setTimeout(onRefreshStatus, 500);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const connected = await printer.testConnection();
      if (connected) {
        toast.success('Print server connection successful');
        onRefreshStatus();
      } else {
        toast.error('Could not connect to print server');
      }
    } catch {
      toast.error('Connection test failed');
    }
    setTesting(false);
  };

  const handleSelectDiscovered = (discovered: DiscoveredPrinter) => {
    setPrinterIp(discovered.ip);
    setPrinterPort(discovered.port.toString());
    toast.info(`Selected ${discovered.name || discovered.ip}`);
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{printerName}</span>
        </div>
        {printer.isConfigured() && (
          <div className="flex items-center gap-2">
            <PrinterStatusIndicator status={status} />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={onRefreshStatus}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Discovered printers dropdown */}
      {discoveredPrinters.length > 0 && (
        <div className="mb-3">
          <Label className="text-xs text-muted-foreground mb-1 block">Discovered Printers</Label>
          <div className="flex flex-wrap gap-2">
            {discoveredPrinters.map((dp, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => handleSelectDiscovered(dp)}
              >
                <Circle className={`w-2 h-2 mr-1.5 ${dp.online ? 'fill-success text-success' : 'fill-destructive text-destructive'}`} />
                {dp.name || dp.ip}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        <div>
          <Label htmlFor={`${printerName}-ip`} className="text-xs">Printer IP Address</Label>
          <Input
            id={`${printerName}-ip`}
            placeholder="192.168.1.100"
            value={printerIp}
            onChange={(e) => setPrinterIp(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`${printerName}-port`} className="text-xs">Printer Port</Label>
            <Input
              id={`${printerName}-port`}
              placeholder="9100"
              value={printerPort}
              onChange={(e) => setPrinterPort(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor={`${printerName}-server`} className="text-xs">Print Server URL</Label>
            <Input
              id={`${printerName}-server`}
              placeholder="http://localhost:3001"
              value={printServerUrl}
              onChange={(e) => setPrintServerUrl(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} className="flex-1">
          <Settings className="w-4 h-4 mr-1" />
          Save Config
        </Button>
        <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !printerIp}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
        </Button>
      </div>
    </div>
  );
}

export function PrinterConnectionUI({ open, onOpenChange }: PrinterConnectionUIProps) {
  const { settings } = useStore();
  const [kitchenConnected, setKitchenConnected] = useState(false);
  const [barConnected, setBarConnected] = useState(false);
  const [receiptConnected, setReceiptConnected] = useState(false);
  const [connecting, setConnecting] = useState<'kitchen' | 'bar' | 'receipt' | null>(null);
  const [connectionMode, setConnectionMode] = useState<'usb' | 'network'>('usb');
  const [showGuide, setShowGuide] = useState(false);

  // Network printer states
  const [networkKitchenConfigured, setNetworkKitchenConfigured] = useState(false);
  const [networkBarConfigured, setNetworkBarConfigured] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [printServerUrl, setPrintServerUrl] = useState('http://localhost:3001');

  // Status states
  const [kitchenStatus, setKitchenStatus] = useState<PrinterStatus | null>(null);
  const [barStatus, setBarStatus] = useState<PrinterStatus | null>(null);

  const isWebUSBSupported = dualPrinter.isSupported();

  // Update connection status on open
  useEffect(() => {
    if (open) {
      const status = dualPrinter.getStatus();
      setKitchenConnected(status.kitchen);
      setBarConnected(status.bar);
      setReceiptConnected(receiptPrinter.isConnected());
      setNetworkKitchenConfigured(networkKitchenPrinter.isConfigured());
      setNetworkBarConfigured(networkBarPrinter.isConfigured());
      
      // Load print server URL from existing config
      const kitchenConfig = networkKitchenPrinter.getConfig();
      if (kitchenConfig?.printServerUrl) {
        setPrintServerUrl(kitchenConfig.printServerUrl);
      }
      
      // Refresh statuses
      refreshKitchenStatus();
      refreshBarStatus();
    }
  }, [open]);

  const refreshKitchenStatus = useCallback(async () => {
    if (networkKitchenPrinter.isConfigured()) {
      const status = await networkKitchenPrinter.checkPrinterStatus();
      setKitchenStatus(status);
    }
  }, []);

  const refreshBarStatus = useCallback(async () => {
    if (networkBarPrinter.isConfigured()) {
      const status = await networkBarPrinter.checkPrinterStatus();
      setBarStatus(status);
    }
  }, []);

  const handleDiscoverPrinters = async () => {
    setDiscovering(true);
    try {
      const printers = await discoverPrinters(printServerUrl);
      setDiscoveredPrinters(printers);
      if (printers.length > 0) {
        toast.success(`Found ${printers.length} printer(s)`);
      } else {
        toast.info('No printers found on network');
      }
    } catch (error) {
      console.error('Discovery error:', error);
      toast.error('Printer discovery failed. Make sure print server is running.');
    }
    setDiscovering(false);
  };

  const handleConnectKitchen = async () => {
    if (!isWebUSBSupported) {
      toast.error('Web USB is not supported in this browser');
      return;
    }

    setConnecting('kitchen');
    try {
      const success = await dualPrinter.connectKitchenPrinter();
      if (success) {
        setKitchenConnected(true);
        toast.success('Kitchen printer connected');
      } else {
        toast.error('Failed to connect kitchen printer');
      }
    } catch (error) {
      console.error('Kitchen printer connection error:', error);
      toast.error('Connection cancelled or failed');
    }
    setConnecting(null);
  };

  const handleConnectBar = async () => {
    if (!isWebUSBSupported) {
      toast.error('Web USB is not supported in this browser');
      return;
    }

    setConnecting('bar');
    try {
      const success = await dualPrinter.connectBarPrinter();
      if (success) {
        setBarConnected(true);
        toast.success('Bar printer connected');
      } else {
        toast.error('Failed to connect bar printer');
      }
    } catch (error) {
      console.error('Bar printer connection error:', error);
      toast.error('Connection cancelled or failed');
    }
    setConnecting(null);
  };

  const handleConnectReceipt = async () => {
    if (!isWebUSBSupported) {
      toast.error('Web USB is not supported in this browser');
      return;
    }

    setConnecting('receipt');
    try {
      await receiptPrinter.connect();
      setReceiptConnected(true);
      toast.success('Receipt printer connected');
    } catch (error) {
      console.error('Receipt printer connection error:', error);
      toast.error('Connection cancelled or failed');
    }
    setConnecting(null);
  };

  const handleTestPrint = async (printer: 'kitchen' | 'bar' | 'receipt', mode: 'usb' | 'network' = 'usb') => {
    try {
      const testData = {
        restaurantName: settings.restaurantName || 'Test',
        tableNumber: 0,
        orderId: 'TEST',
        time: new Date().toLocaleTimeString(),
        items: [{ name: 'Test Item', qty: 1 }],
      };

      if (mode === 'network') {
        if (printer === 'kitchen' && networkKitchenConfigured) {
          const success = await networkKitchenPrinter.printKOT({
            ...testData,
            printerLabel: 'KITCHEN TEST (NETWORK)'
          });
          if (success) toast.success('Network kitchen test print sent');
          else toast.error('Network print failed');
        } else if (printer === 'bar' && networkBarConfigured) {
          const success = await networkBarPrinter.printKOT({
            ...testData,
            printerLabel: 'BAR TEST (NETWORK)'
          });
          if (success) toast.success('Network bar test print sent');
          else toast.error('Network print failed');
        }
      } else {
        if (printer === 'kitchen' && kitchenConnected) {
          await dualPrinter.kitchenPrinter.printKOT({
            ...testData,
            printerLabel: 'KITCHEN TEST'
          });
          toast.success('Kitchen test print sent');
        } else if (printer === 'bar' && barConnected) {
          await dualPrinter.barPrinter.printKOT({
            ...testData,
            printerLabel: 'BAR TEST'
          });
          toast.success('Bar test print sent');
        } else if (printer === 'receipt' && receiptConnected) {
          await receiptPrinter.printTest();
          toast.success('Receipt test print sent');
        }
      }
    } catch (error) {
      console.error('Test print error:', error);
      toast.error('Test print failed');
    }
  };

  const handleDisconnectAll = async () => {
    await dualPrinter.disconnectAll();
    await receiptPrinter.disconnect();
    networkKitchenPrinter.disconnect();
    networkBarPrinter.disconnect();
    setKitchenConnected(false);
    setBarConnected(false);
    setReceiptConnected(false);
    setNetworkKitchenConfigured(false);
    setNetworkBarConfigured(false);
    setKitchenStatus(null);
    setBarStatus(null);
    toast.info('All printers disconnected');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Printer Connections
          </DialogTitle>
          <DialogDescription>
            Connect thermal printers via USB (local) or Network (remote kitchen/bar).
          </DialogDescription>
        </DialogHeader>

        <Tabs value={connectionMode} onValueChange={(v) => setConnectionMode(v as 'usb' | 'network')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="usb" className="flex items-center gap-1.5">
              <Usb className="w-4 h-4" />
              USB (Local)
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4" />
              Network (Remote)
            </TabsTrigger>
          </TabsList>

          {/* USB Tab */}
          <TabsContent value="usb" className="space-y-4 mt-4">
            {!isWebUSBSupported ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Web USB Not Supported</p>
                  <p className="text-xs mt-1">Use Chrome or Edge browser on desktop for USB printer support.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Kitchen Printer */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      kitchenConnected ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Kitchen Printer</p>
                      <p className="text-xs text-muted-foreground">
                        {kitchenConnected ? 'Connected via USB' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {kitchenConnected && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTestPrint('kitchen', 'usb')}
                        className="h-8 text-xs"
                      >
                        Test
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={kitchenConnected ? 'outline' : 'default'}
                      onClick={handleConnectKitchen}
                      disabled={connecting !== null}
                      className="h-8"
                    >
                      {connecting === 'kitchen' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : kitchenConnected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plug className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Bar Printer - Only show if dual printer is enabled */}
                {settings.dualPrinterEnabled && (
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        barConnected ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Bar Printer</p>
                        <p className="text-xs text-muted-foreground">
                          {barConnected ? 'Connected via USB' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {barConnected && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestPrint('bar', 'usb')}
                          className="h-8 text-xs"
                        >
                          Test
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={barConnected ? 'outline' : 'default'}
                        onClick={handleConnectBar}
                        disabled={connecting !== null}
                        className="h-8"
                      >
                        {connecting === 'bar' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : barConnected ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Plug className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Receipt Printer */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      receiptConnected ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Receipt Printer</p>
                      <p className="text-xs text-muted-foreground">
                        {receiptConnected ? 'Connected via USB' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {receiptConnected && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTestPrint('receipt', 'usb')}
                        className="h-8 text-xs"
                      >
                        Test
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={receiptConnected ? 'outline' : 'default'}
                      onClick={handleConnectReceipt}
                      disabled={connecting !== null}
                      className="h-8"
                    >
                      {connecting === 'receipt' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : receiptConnected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plug className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* USB Info */}
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium mb-1">USB Connection Steps:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Plug in your USB thermal printer</li>
                    <li>Click the connect button</li>
                    <li>Select printer from browser popup</li>
                  </ol>
                </div>
              </>
            )}
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-foreground">
                Network printing requires a <strong>local print server</strong>.
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 ml-1 text-primary"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  <HelpCircle className="w-3 h-3 mr-0.5" />
                  {showGuide ? 'Hide' : 'Setup Guide'}
                </Button>
              </p>
            </div>

            {showGuide && (
              <div className="p-4 rounded-lg border border-border bg-muted/30 text-sm space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Print Server with Discovery
                </h4>
                
                <div className="bg-background p-3 rounded border text-xs font-mono max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-foreground">
{`const http = require('http');
const net = require('net');
const os = require('os');

const PORT = 3001;

// Get local network range
function getLocalSubnet() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        return parts.slice(0, 3).join('.') + '.';
      }
    }
  }
  return '192.168.1.';
}

// Scan for printers on port 9100
async function scanPrinters() {
  const subnet = getLocalSubnet();
  const printers = [];
  const timeout = 500;
  
  const promises = [];
  for (let i = 1; i <= 254; i++) {
    const ip = subnet + i;
    promises.push(new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        printers.push({ ip, port: 9100, online: true });
        socket.destroy();
        resolve();
      });
      socket.on('timeout', () => { socket.destroy(); resolve(); });
      socket.on('error', () => { socket.destroy(); resolve(); });
      socket.connect(9100, ip);
    }));
  }
  
  await Promise.all(promises);
  return printers;
}

// Check single printer status
async function checkPrinter(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve({ online: true });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ online: false, error: 'Timeout' });
    });
    socket.on('error', (err) => {
      socket.destroy();
      resolve({ online: false, error: err.message });
    });
    socket.connect(port, ip);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.writeHead(200).end();
  }
  
  // Discover printers
  if (req.url === '/discover') {
    const printers = await scanPrinters();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ printers }));
  }
  
  // Check printer status
  if (req.url === '/printer-status' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      const { printerIp, printerPort } = JSON.parse(body);
      const status = await checkPrinter(printerIp, printerPort || 9100);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(status));
    });
    return;
  }
  
  // Status endpoint
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }
  
  // Print endpoint
  if (req.url === '/print' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { printerIp, printerPort, data } = JSON.parse(body);
      const client = new net.Socket();
      client.setTimeout(5000);
      client.connect(printerPort || 9100, printerIp, () => {
        client.write(Buffer.from(data));
        client.end();
        res.writeHead(200).end(JSON.stringify({ success: true }));
      });
      client.on('error', (err) => {
        res.writeHead(500).end(JSON.stringify({ error: err.message }));
      });
    });
    return;
  }
  
  res.writeHead(404).end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Print server on port ' + PORT);
});`}
                  </pre>
                </div>
                
                <p className="text-muted-foreground text-xs">
                  Save as <code className="bg-background px-1 rounded">print-server.js</code> and run with <code className="bg-background px-1 rounded">node print-server.js</code>
                </p>
              </div>
            )}

            {/* Printer Discovery */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs">Print Server URL</Label>
                <Input
                  placeholder="http://localhost:3001"
                  value={printServerUrl}
                  onChange={(e) => setPrintServerUrl(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="pt-5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDiscoverPrinters}
                  disabled={discovering}
                  className="h-9"
                >
                  {discovering ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Search className="w-4 h-4 mr-1" />
                  )}
                  Discover
                </Button>
              </div>
            </div>

            {/* Network Kitchen Printer */}
            <NetworkConfigForm
              printerName="Kitchen Printer (Network)"
              printer={networkKitchenPrinter}
              discoveredPrinters={discoveredPrinters}
              onConfigured={() => setNetworkKitchenConfigured(true)}
              status={kitchenStatus}
              onRefreshStatus={refreshKitchenStatus}
            />

            {networkKitchenConfigured && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestPrint('kitchen', 'network')}
                >
                  Test Kitchen Print
                </Button>
              </div>
            )}

            {/* Network Bar Printer - Only show if dual printer is enabled */}
            {settings.dualPrinterEnabled && (
              <>
                <NetworkConfigForm
                  printerName="Bar Printer (Network)"
                  printer={networkBarPrinter}
                  discoveredPrinters={discoveredPrinters}
                  onConfigured={() => setNetworkBarConfigured(true)}
                  status={barStatus}
                  onRefreshStatus={refreshBarStatus}
                />

                {networkBarConfigured && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestPrint('bar', 'network')}
                    >
                      Test Bar Print
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {(kitchenConnected || barConnected || receiptConnected || networkKitchenConfigured || networkBarConfigured) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnectAll}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Unplug className="w-4 h-4 mr-1" />
              Disconnect All
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
