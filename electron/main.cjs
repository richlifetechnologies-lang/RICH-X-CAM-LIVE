const { app, BrowserWindow, session, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

const API_PORT = parseInt(process.env.RICHX_API_PORT || '3120', 10);
const API_BASE = `http://127.0.0.1:${API_PORT}`;
let apiServerProc = null;

function logApi(msg) {
  console.log(`[richx-api] ${msg}`);
}

/**
 * Spawns the bundled Express API server as a plain Node process so the app
 * always has working /api/fal/* routes, both in development and installed.
 */
function startApiServer() {
  const candidates = [
    path.join(process.resourcesPath || '', 'dist-server', 'server.cjs'),
    path.join(__dirname, '..', 'dist-server', 'server.cjs'),
    path.join(app.getAppPath(), 'dist-server', 'server.cjs'),
  ];

  const serverBundle = candidates.find((p) => p && fs.existsSync(p));
  if (!serverBundle) {
    logApi('server bundle not found; fal.ai API routes will be unavailable.');
    return false;
  }

  try {
    apiServerProc = spawn(process.execPath, [serverBundle], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: 'production',
        PORT: String(API_PORT),
        RICHX_DIST_DIR: path.join(__dirname, '..', 'dist'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    apiServerProc.stdout.on('data', (d) => logApi(d.toString().trim()));
    apiServerProc.stderr.on('data', (d) => logApi(`stderr: ${d.toString().trim()}`));
    apiServerProc.on('exit', (code) => {
      logApi(`exited with code ${code}`);
      apiServerProc = null;
    });
    return true;
  } catch (err) {
    logApi(`failed to spawn: ${err.message}`);
    return false;
  }
}

async function waitForApiServer(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${API_BASE}/api/fal/status`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function runPowerShell(script, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    exec(
      `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
      { maxBuffer: 1024 * 1024, timeout: timeoutMs },
      (err, stdout, stderr) => {
        if (err) {
          resolve({ ok: false, error: err.message, stderr: stderr || '' });
          return;
        }
        resolve({ ok: true, stdout: (stdout || '').trim() });
      }
    );
  });
}

function createWindow(loadUrl) {
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

  // Load the app: prefer the local API server (secure context, working /api routes),
  // fall back to the bundled static files if the server could not start.
  if (loadUrl) {
    mainWindow.loadURL(loadUrl);
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath).catch(() => {
      mainWindow.loadURL('http://localhost:3000');
    });
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC Handlers for Virtual Devices (RICHX CAM & RICHX MIC)
ipcMain.handle('install-virtual-drivers', async () => {
  if (process.platform !== 'win32') {
    return { success: false, message: 'Virtual driver installation is supported on Windows only.' };
  }

  const candidatePaths = [
    path.join(process.resourcesPath, 'drivers', 'install-richx-virtual-devices.bat'),
    path.join(app.getAppPath(), 'drivers', 'install-richx-virtual-devices.bat'),
    path.join(__dirname, '..', 'drivers', 'install-richx-virtual-devices.bat'),
    path.join(__dirname, 'drivers', 'install-richx-virtual-devices.bat'),
    path.join(process.cwd(), 'drivers', 'install-richx-virtual-devices.bat'),
  ];

  const driverScript = candidatePaths.find((p) => fs.existsSync(p));
  if (!driverScript) {
    return { success: false, message: 'Driver installation script not found.' };
  }

  const psScript = `Start-Process -FilePath "cmd.exe" -ArgumentList '/c','"${driverScript}"' -Verb RunAs -Wait`;
  const result = await runPowerShell(psScript, 30 * 60 * 1000);
  if (!result.ok) {
    return { success: false, message: result.error };
  }
  return {
    success: true,
    message:
      'Driver installer finished. See the installer window for details, then restart your calling apps (Zoom, Teams, Discord, etc.) so the new RICHX devices appear.',
  };
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
  if (process.platform !== 'win32') {
    return { cameraInstalled: false, audioInstalled: false, virtualCameras: [], virtualAudioDevices: [] };
  }

  const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$cams = @(Get-PnpDevice -Class CAMERA | Select-Object -ExpandProperty FriendlyName)
$audioEndpoints = @(Get-PnpDevice -Class AudioEndpoint | Select-Object -ExpandProperty FriendlyName)
$richxCam = @($cams | Where-Object { $_ -match 'RICHX' })
$richxMic = @($audioEndpoints | Where-Object { $_ -match 'RICHX MIC' })
$knownVirtualCams = @($cams | Where-Object { $_ -match 'OBS|Virtual|Camo|DroidCam|ManyCam|XSplit|NVIDIA Broadcast|VDO|IVCam|Droid' })
$knownVirtualAudio = @($audioEndpoints | Where-Object { $_ -match 'CABLE|VB-Audio|Virtual Audio|VoiceMeeter|RICHX' })
[PSCustomObject]@{
  cameraInstalled = [bool]($richxCam.Count -gt 0)
  cameraName = if ($richxCam.Count -gt 0) { $richxCam[0] } else { $null }
  audioInstalled = [bool]($richxMic.Count -gt 0)
  audioName = if ($richxMic.Count -gt 0) { $richxMic[0] } else { $null }
  virtualCameras = @($knownVirtualCams)
  virtualAudioDevices = @($knownVirtualAudio)
} | ConvertTo-Json -Compress
`;

  const result = await runPowerShell(psScript);
  if (!result.ok || !result.stdout) {
    return {
      cameraInstalled: false,
      audioInstalled: false,
      virtualCameras: [],
      virtualAudioDevices: [],
      error: result.error || 'Could not query device status.',
    };
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    return { cameraInstalled: false, audioInstalled: false, virtualCameras: [], virtualAudioDevices: [] };
  }
});

app.whenReady().then(async () => {
  const spawned = startApiServer();
  let loadUrl = null;
  if (spawned && (await waitForApiServer())) {
    loadUrl = `${API_BASE}/`;
  }
  createWindow(loadUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(loadUrl);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (apiServerProc) {
    try {
      apiServerProc.kill();
    } catch {}
    apiServerProc = null;
  }
});
