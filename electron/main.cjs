const { app, BrowserWindow, session, shell, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'icon.png');

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'RICH X CAM LIVE — Real-Time Video & Voice Studio',
    backgroundColor: '#030712',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
  });

  // Automatically approve camera, microphone, and media permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      'media',
      'mediaKeySystem',
      'notifications',
      'fullscreen',
      'pointerLock',
      'openExternal',
    ];
    if (allowedPermissions.includes(permission)) {
      return callback(true);
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler(() => true);

  // Enable audio autoplay without user gesture requirements
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('enable-experimental-web-platform-features');

  // Load the built application files
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath).catch(() => {
    // If running in development server mode
    mainWindow.loadURL('http://localhost:3000');
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC Handlers for Virtual Devices (RICHX CAM & RICHX MIC)
ipcMain.handle('install-virtual-drivers', async () => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, message: 'Virtual driver installation is supported on Windows.' });
    }

    // Try packaged driver path or dev driver path
    const candidatePaths = [
      path.join(process.resourcesPath, 'drivers', 'install-richx-virtual-devices.bat'),
      path.join(app.getAppPath(), 'drivers', 'install-richx-virtual-devices.bat'),
      path.join(__dirname, '..', 'drivers', 'install-richx-virtual-devices.bat'),
      path.join(__dirname, 'drivers', 'install-richx-virtual-devices.bat'),
      path.join(process.cwd(), 'drivers', 'install-richx-virtual-devices.bat'),
    ];

    const driverScript = candidatePaths.find((p) => require('fs').existsSync(p));
    if (!driverScript) {
      return resolve({ success: false, message: 'Driver installation script not found.' });
    }

    // Launch elevated PowerShell process to run the batch script with admin rights
    const psCmd = `Start-Process -FilePath "cmd.exe" -ArgumentList "/c \\"${driverScript}\\"" -Verb RunAs -Wait`;
    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`, (err) => {
      if (err) {
        return resolve({ success: false, message: err.message });
      }
      resolve({ success: true, message: 'RICHX CAM and RICHX MIC drivers installed successfully!' });
    });
  });
});

ipcMain.handle('open-sound-settings', async () => {
  if (process.platform === 'win32') {
    exec('control mmsys.cpl sounds');
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('open-camera-settings', async () => {
  if (process.platform === 'win32') {
    exec('start ms-settings:camera');
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('check-drivers-status', async () => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ cameraInstalled: false, audioInstalled: false });
    }

    exec('reg query "HKLM\\SOFTWARE\\Classes\\CLSID\\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\\Instance\\RICHX_CAM"', (err) => {
      const cameraInstalled = !err;
      resolve({ cameraInstalled, audioInstalled: true });
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
