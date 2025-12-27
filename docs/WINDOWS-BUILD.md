# Windows Store Build Instructions

## Prerequisites
- Windows 10/11
- Visual Studio 2022 with UWP workload (or PWABuilder)
- Windows SDK 10.0.17763.0 or higher
- Microsoft Partner Center account

## Option A: PWABuilder (Easiest - Recommended)

PWABuilder generates MSIX packages directly from your PWA:

1. Deploy your app to a public URL with HTTPS
2. Go to https://pwabuilder.com
3. Enter your URL and click "Start"
4. Review PWA score (aim for 100+)
5. Click "Package for stores" → "Windows"
6. Configure options:
   - Package ID: `SovereignIntelligence.AI`
   - Publisher ID: Your Partner Center publisher ID
   - Publisher Display Name: `Sovereign Intelligence Inc.`
7. Download the generated MSIX package
8. Upload to Microsoft Partner Center

## Option B: Visual Studio (Full Control)

### Step 1: Create Windows Project

```powershell
# Install Windows App SDK
winget install Microsoft.WindowsAppSDK

# Or via Visual Studio Installer:
# - Open Visual Studio Installer
# - Modify → Workloads → Universal Windows Platform development
```

### Step 2: Create Hosted Web App

1. Open Visual Studio 2022
2. Create new project → "Windows Application Packaging Project"
3. Add reference to your web app URL
4. Configure Package.appxmanifest (use provided template)

### Step 3: Build MSIX

```powershell
# Build release package
msbuild /p:Configuration=Release /p:Platform=x64 /p:AppxPackageDir=.\AppPackages\
```

## Option C: Electron (Native Desktop)

For full desktop features:

```bash
# Install Electron Forge
npm install --save-dev @electron-forge/cli
npx electron-forge import

# Add to package.json
npm install electron

# Build Windows installer
npm run make -- --platform=win32
```

### Electron Main Process (main.js)

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'public/icons/icon-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a1628',
      symbolColor: '#ffffff'
    }
  });

  // Load production URL or local server
  win.loadURL('https://sovereign.ai');
  
  // Or for development:
  // win.loadURL('http://localhost:3000');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

## Microsoft Partner Center Setup

### Create Developer Account

1. Go to https://partner.microsoft.com/dashboard
2. Sign in with Microsoft account
3. Pay registration fee ($19 individual / $99 company)
4. Complete account verification

### Create App Submission

1. Dashboard → Apps and games → + New product → App
2. Reserve app name: "Sovereign Intelligence"
3. Configure:
   - Product identity
   - Pricing and availability
   - Properties (category: Business)
   - Age ratings
   - Store listings

### Required Assets

| Asset | Size | Format |
|-------|------|--------|
| Store Logo | 300x300 | PNG |
| App Icon | 150x150, 44x44 | PNG |
| Wide Tile | 310x150 | PNG |
| Large Tile | 310x310 | PNG |
| Small Tile | 71x71 | PNG |
| Splash Screen | 620x300 | PNG |
| Screenshots | 1366x768 min | PNG (4-10 images) |
| Promotional Images | Various | PNG |

### Store Listing Content

**App Name:** Sovereign Intelligence

**Short Description (100 chars):**
```
AI-powered intelligence platform for enterprise analytics and decision support.
```

**Description (10,000 chars max):**
```
Sovereign Intelligence is the world's most advanced AI platform, providing real-time intelligence, predictive analytics, and decision support across 10 industry verticals.

KEY FEATURES

★ Enterprise Analytics Dashboard
Real-time business intelligence with customizable KPIs and predictive insights.

★ Government Reform Engine
Policy analysis, efficiency optimization, and compliance monitoring.

★ Defense Intelligence Suite
Secure threat assessment and strategic planning tools.

★ 10 Industry Verticals
Clinical, Defense, Energy, Enterprise, Finance, Insurance, Logistics, Manufacturing, Pharma, Reform

GLOBAL CAPABILITIES

• 207 Languages with real-time translation
• RTL support for Arabic, Hebrew, Urdu, Persian
• Self-learning AI that improves over time
• Natural Language Processing
• Predictive analytics

ENTERPRISE SECURITY

• End-to-end encryption
• SOC 2 Type II compliant
• GDPR compliant
• Role-based access control
• Complete audit logging

SUBSCRIPTION OPTIONS

• Starter: $99/month
• Professional: $299/month
• Enterprise: $999/month
• Government: Custom pricing

Perfect for government agencies, defense organizations, healthcare systems, financial institutions, and enterprise companies.
```

**Keywords:**
```
AI, artificial intelligence, analytics, business intelligence, enterprise, government, defense, data visualization, predictive analytics, machine learning
```

**Categories:**
- Primary: Business
- Secondary: Productivity

## Windows-Specific Features

### Jump List Integration

```javascript
// In Electron main process
const { app } = require('electron');

app.setUserTasks([
  {
    program: process.execPath,
    arguments: '--dashboard',
    iconPath: process.execPath,
    iconIndex: 0,
    title: 'Open Dashboard',
    description: 'Launch the analytics dashboard'
  },
  {
    program: process.execPath,
    arguments: '--reform',
    iconPath: process.execPath,
    iconIndex: 0,
    title: 'Reform Engine',
    description: 'Open the Government Reform module'
  }
]);
```

### Toast Notifications

```javascript
const { Notification } = require('electron');

function showNotification(title, body) {
  new Notification({
    title,
    body,
    icon: 'public/icons/icon-256x256.png'
  }).show();
}
```

### System Tray

```javascript
const { Tray, Menu } = require('electron');

let tray = null;

app.whenReady().then(() => {
  tray = new Tray('public/icons/icon-32x32.png');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Sovereign Intelligence', click: createWindow },
    { label: 'Dashboard', click: () => openUrl('/dashboard') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setToolTip('Sovereign Intelligence');
  tray.setContextMenu(contextMenu);
});
```

## Release Checklist

- [ ] Package.appxmanifest configured correctly
- [ ] All required tile images generated
- [ ] App icon in all required sizes
- [ ] Screenshots (1366x768 minimum)
- [ ] Privacy policy URL accessible
- [ ] Age rating questionnaire completed
- [ ] Package validated with Windows App Cert Kit
- [ ] Tested on Windows 10 and 11
- [ ] MSIX signed with valid certificate

## Testing

### Windows App Certification Kit

```powershell
# Run certification tests
"C:\Program Files (x86)\Windows Kits\10\App Certification Kit\appcert.exe" test -appxpackagepath ".\AppPackages\SovereignIntelligence.msix" -reportoutputpath ".\TestResults"
```

### Sideload for Testing

```powershell
# Enable Developer Mode in Windows Settings first
Add-AppxPackage -Path ".\SovereignIntelligence.msix"
```

## Timeline

- Certification: 1-3 business days typically
- If issues found: Fix and resubmit
- After approval: Publish immediately or schedule
