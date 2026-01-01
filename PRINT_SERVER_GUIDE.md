# Network Print Server Setup Guide

This guide explains how to set up network printing for remote kitchen/bar printers when USB connection isn't possible due to distance.

## Overview

Since web browsers cannot directly connect to raw TCP sockets (which thermal printers use), we need a **print server** running on your local network that:
1. Receives print jobs from the browser via HTTP
2. Forwards them to the printer on the network
3. Discovers printers on the network (auto-detection)
4. Monitors printer status (online/offline)

```
┌─────────────┐     HTTP      ┌──────────────┐     TCP      ┌─────────────┐
│   Browser   │ ──────────── │ Print Server │ ──────────── │   Printer   │
│  (Counter)  │   Port 3001   │  (Node.js)   │   Port 9100  │  (Kitchen)  │
└─────────────┘               └──────────────┘              └─────────────┘
```

## Features

- **Print Jobs**: Send ESC/POS commands to network printers
- **Auto-Discovery**: Scan local network for printers on port 9100
- **Status Monitoring**: Check if printers are online/offline
- **CORS Support**: Works with browser-based applications

## Requirements

1. **Network Printer**: A thermal printer with WiFi or Ethernet (e.g., XPrinter XP-N160II WiFi)
2. **Print Server Computer**: Any always-on computer on your network (can be a Raspberry Pi, old laptop, or the POS computer itself)
3. **Node.js**: Installed on the print server computer (version 14+)

## Quick Start

### 1. Install Node.js

Download from https://nodejs.org/ or use package manager:

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Windows: Download installer from nodejs.org
```

### 2. Create Print Server

Create a folder and save this as `print-server.js`:

```javascript
const http = require('http');
const net = require('net');
const os = require('os');

const PORT = 3001;

// ==================== UTILITY FUNCTIONS ====================

// Get local network subnet (e.g., "192.168.1.")
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

// ==================== PRINTER DISCOVERY ====================

// Scan the local network for printers on port 9100
async function scanForPrinters() {
  const subnet = getLocalSubnet();
  const printers = [];
  const timeout = 500; // 500ms timeout per IP
  
  console.log(`Scanning subnet ${subnet}0/24 for printers...`);
  
  const promises = [];
  for (let i = 1; i <= 254; i++) {
    const ip = subnet + i;
    promises.push(new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        console.log(`Found printer at ${ip}:9100`);
        printers.push({
          ip,
          port: 9100,
          name: `Printer at ${ip}`,
          online: true,
        });
        socket.destroy();
        resolve();
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve();
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve();
      });
      
      socket.connect(9100, ip);
    }));
  }
  
  await Promise.all(promises);
  console.log(`Discovery complete. Found ${printers.length} printer(s).`);
  return printers;
}

// ==================== PRINTER STATUS CHECK ====================

// Check if a specific printer is online
async function checkPrinterStatus(ip, port = 9100) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve({
        online: true,
        paperLow: false, // ESC/POS status would require DLE EOT commands
        coverOpen: false,
        lastChecked: new Date().toISOString(),
      });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        online: false,
        error: 'Connection timeout',
        lastChecked: new Date().toISOString(),
      });
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      resolve({
        online: false,
        error: err.message,
        lastChecked: new Date().toISOString(),
      });
    });
    
    socket.connect(port, ip);
  });
}

// ==================== HTTP SERVER ====================

const server = http.createServer(async (req, res) => {
  // Enable CORS for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }
  
  // -------------------- DISCOVERY ENDPOINT --------------------
  if (req.url === '/discover' && req.method === 'GET') {
    try {
      const printers = await scanForPrinters();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ printers }));
    } catch (err) {
      console.error('Discovery error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message, printers: [] }));
    }
  }
  
  // -------------------- PRINTER STATUS ENDPOINT --------------------
  if (req.url === '/printer-status' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { printerIp, printerPort } = JSON.parse(body);
        const status = await checkPrinterStatus(printerIp, printerPort || 9100);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
      } catch (err) {
        console.error('Status check error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ online: false, error: err.message }));
      }
    });
    return;
  }
  
  // -------------------- HEALTH CHECK ENDPOINT --------------------
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      subnet: getLocalSubnet() + '0/24',
    }));
  }
  
  // -------------------- PRINT ENDPOINT --------------------
  if (req.url === '/print' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { printerIp, printerPort, data } = JSON.parse(body);
        
        console.log(`Printing to ${printerIp}:${printerPort || 9100}`);
        
        const client = new net.Socket();
        client.setTimeout(5000);
        
        client.connect(printerPort || 9100, printerIp, () => {
          const buffer = Buffer.from(data);
          client.write(buffer);
          client.end();
          console.log('Print job sent successfully');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
        
        client.on('error', (err) => {
          console.error('Printer error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        });
        
        client.on('timeout', () => {
          console.error('Printer connection timeout');
          client.destroy();
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Connection timeout' }));
        });
      } catch (err) {
        console.error('Parse error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🖨️  NETWORK PRINT SERVER STARTED               ║
╠═══════════════════════════════════════════════════════════╣
║  URL:      http://0.0.0.0:${PORT}                          ║
║  Subnet:   ${getLocalSubnet()}0/24                          
║                                                           ║
║  Endpoints:                                               ║
║  • GET  /status         - Health check                    ║
║  • GET  /discover       - Find printers on network        ║
║  • POST /printer-status - Check specific printer          ║
║  • POST /print          - Send print job                  ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
```

### 3. Run the Server

```bash
node print-server.js
```

### 4. Keep Running with PM2 (Recommended)

```bash
npm install -g pm2
pm2 start print-server.js --name "print-server"
pm2 save
pm2 startup  # Auto-start on boot
```

## API Reference

### GET /status
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "subnet": "192.168.1.0/24"
}
```

### GET /discover
Scans the local network for printers on port 9100.

**Response:**
```json
{
  "printers": [
    { "ip": "192.168.1.100", "port": 9100, "name": "Printer at 192.168.1.100", "online": true },
    { "ip": "192.168.1.101", "port": 9100, "name": "Printer at 192.168.1.101", "online": true }
  ]
}
```

### POST /printer-status
Check if a specific printer is online.

**Request:**
```json
{
  "printerIp": "192.168.1.100",
  "printerPort": 9100
}
```

**Response:**
```json
{
  "online": true,
  "paperLow": false,
  "coverOpen": false,
  "lastChecked": "2024-01-01T12:00:00.000Z"
}
```

### POST /print
Send a print job to a network printer.

**Request:**
```json
{
  "printerIp": "192.168.1.100",
  "printerPort": 9100,
  "data": [27, 64, 27, 97, 1, ...]  // ESC/POS commands as byte array
}
```

**Response:**
```json
{
  "success": true
}
```

## Configuration in POS App

1. Open the Counter page
2. Click the **Printer** icon in the header
3. Go to **Network (Remote)** tab
4. Enter the print server URL (e.g., `http://192.168.1.50:3001`)
5. Click **Discover** to find printers automatically
6. Select a discovered printer or enter IP manually
7. Click **Save Config** then **Test**

## Troubleshooting

### "Connection failed"
- Verify printer IP is correct
- Check if printer is on the same network
- Ping the printer: `ping 192.168.1.100`
- Check printer port (usually 9100 for raw printing)

### "Print server not responding"
- Verify print server is running: `curl http://localhost:3001/status`
- Check firewall allows port 3001
- On Windows: Allow Node.js through Windows Firewall
- On Linux: `sudo ufw allow 3001`

### "No printers discovered"
- Ensure printers are on the same subnet
- Some printers use different ports (try 9100, 9101, 9102)
- Check if printer has network printing enabled

### "Prints are garbled"
- Printer may not be ESC/POS compatible
- Check printer documentation for correct port

## Network Printer Recommendations (Nepal)

| Model | Price (NPR) | Connection | Status Feedback |
|-------|-------------|------------|-----------------|
| XPrinter XP-N160II | ₹4,000-5,000 | WiFi + Ethernet | Basic |
| XPrinter XP-E200M | ₹3,500-4,500 | Ethernet | Basic |
| Epson TM-T82X | ₹15,000+ | WiFi + Ethernet | Full (DLE EOT) |

## Raspberry Pi Setup

Perfect for a dedicated print server:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Create print server
mkdir ~/print-server && cd ~/print-server
nano print-server.js  # Paste the code above
node print-server.js

# Keep running with PM2
npm install -g pm2
pm2 start print-server.js --name "print-server"
pm2 save
pm2 startup
```

## Security Notes

- The print server should only run on your local network
- Do not expose port 3001 to the internet
- For multiple locations, set up a VPN
- Consider adding authentication for production use

## Advanced: Paper Status Detection

Some printers support DLE EOT commands for real-time status. To enable:

```javascript
// Send DLE EOT 1 to get printer status
const DLE_EOT = Buffer.from([0x10, 0x04, 0x01]);
client.write(DLE_EOT);
client.on('data', (data) => {
  // Parse status byte
  const paperOut = (data[0] & 0x0C) !== 0;
  const coverOpen = (data[0] & 0x60) !== 0;
});
```

Note: Not all budget printers support this feature.
