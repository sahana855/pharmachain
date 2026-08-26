// PharmaChain Desktop App - Electron Main Process
// Loads the app from the Express+MongoDB backend (server/index.js) which serves
// both the built SPA (dist/) and the /api endpoints. This ensures the desktop
// app talks to the REAL MongoDB backend (auth, medicines, QR, shipment tracking).
const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

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

    // Wait for the Express+MongoDB backend to be ready (try to auto-start it if missing)
    let ready = await isBackendRunning();
    let backendProc = null;

    if (!ready) {
      // Try to start the backend using node server/index.js
      try {
        const serverPath = path.join(__dirname, '..');
        backendProc = spawn('node', ['server/index.js'], {
          cwd: serverPath,
          env: process.env,
          stdio: 'inherit',
        });
      } catch (err) {
        backendProc = null;
      }

      // Wait up to 20s for backend to respond
      let attempts = 0;
      while (!ready && attempts < 20) {
        await new Promise((r) => setTimeout(r, 1000));
        attempts += 1;
        ready = await isBackendRunning();
      }
    }

    if (!ready) {
      if (backendProc) {
        try { backendProc.kill(); } catch {}
      }
      dialog.showErrorBox(
        'Backend not running',
        'The PharmaChain backend (Express + MongoDB) was not reachable on port 41837 and could not be started automatically.\n\n' +
          'Please start it manually in the project folder: npm run dev:server\n' +
          'Or use start.bat to start both the backend and the desktop app.'
      );
      app.quit();
      return;
    }

    // If we started a backend process here, ensure it is terminated when the app quits
    if (backendProc) {
      app.on('before-quit', () => {
        try { backendProc.kill(); } catch {}
      });
      process.on('exit', () => {
        try { backendProc.kill(); } catch {}
      });
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

