// PharmaChain Desktop App - Electron Main Process
// Loads the app from the Express+MongoDB backend (server/index.js) which serves
// both the built SPA (dist/) and the /api endpoints. This ensures the desktop
// app talks to the REAL MongoDB backend (auth, medicines, QR, shipment tracking).
const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const BACKEND_URL = process.env.PHARMACHAIN_BACKEND_URL || 'http://127.0.0.1:41837';
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 41837;

const DIST_DIR = path.join(__dirname, '..', 'dist');

let mainWindow = null;

function isBackendRunning() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'PharmaChain - Pharmacy Supply Chain',
    autoHideMenuBar: true,
    backgroundColor: '#eef2ff',
    icon: path.join(DIST_DIR, 'icons', 'icon-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Grant camera (and microphone if ever needed) access for the QR scanner.
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'camera'];
    callback(allowed.includes(permission));
  });
  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'videoinput' || details.deviceType === 'camera') return true;
    return details.deviceType === 'audioinput';
  });

  // Open external links (http/https) in the system browser, not in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

// Clear ALL session caches before loading, so the app always shows the latest build.
  mainWindow.webContents.session.clearCache(() => {
    mainWindow.webContents.session.clearStorageData({
      storages: ['serviceworkers', 'cachestorage', 'cookies', 'localstorage'],
    }).then(() => {
      mainWindow.loadURL(BACKEND_URL);

      // Second pass: after load, clear cache once more and reload to ensure fresh assets.
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          mainWindow.webContents.session.clearCache(() => {
            mainWindow.webContents.reloadIgnoringCache();
          });
        }, 1200);
      });
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Allow only ONE app instance.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Ensure production build exists
    if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
      dialog.showErrorBox(
        'Build not found',
        'The app has not been built yet. Please run "npm run build" first, then open the app again.'
      );
      app.quit();
      return;
    }

    // Wait for the Express+MongoDB backend to be ready
    let ready = await isBackendRunning();
    if (!ready) {
      let attempts = 0;
      while (!ready && attempts < 10) {
        await new Promise((r) => setTimeout(r, 1000));
        attempts += 1;
        ready = await isBackendRunning();
      }
    }

    if (!ready) {
      dialog.showErrorBox(
        'Backend not running',
        'The PharmaChain backend (Express + MongoDB) is not reachable on port 41837.\n\n' +
          'Please start it first:  npm run dev:server\n' +
          '(Windows users can double-click start.bat which starts everything).'
      );
      app.quit();
      return;
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  });
}

