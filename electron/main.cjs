const { app, BrowserWindow, session, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { exec, spawn } = require('child_process');

let API_PORT = parseInt(process.env.RICHX_API_PORT || '3120', 10);
let API_BASE = `http://127.0.0.1:${API_PORT}`;
let apiServerProc = null;
let lastLoadUrl = null;
let lastLoadOptions = undefined;

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

function findFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(0));
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
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

function createWindow(loadUrl, loadOptions) {
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
  // fall back to the bundled static files only if the server could not start.
  if (loadUrl) {
    mainWindow.loadURL(loadUrl);
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath, loadOptions || {}).catch(() => {
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
$dshowCams = @()
$dshowPath = 'HKLM:\SOFTWARE\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance'
if (Test-Path $dshowPath) {
    $dshowCams += Get-ChildItem $dshowPath | ForEach-Object { (Get-ItemProperty $_.PSPath -Name FriendlyName -ErrorAction SilentlyContinue).FriendlyName }
}
$dshowPathCU = 'HKCU:\SOFTWARE\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance'
if (Test-Path $dshowPathCU) {
    $dshowCams += Get-ChildItem $dshowPathCU | ForEach-Object { (Get-ItemProperty $_.PSPath -Name FriendlyName -ErrorAction SilentlyContinue).FriendlyName }
}
$allCams = @($cams + $dshowCams | Where-Object { $_ }) | Select-Object -Unique
$audioEndpoints = @(Get-PnpDevice -Class AudioEndpoint | Select-Object -ExpandProperty FriendlyName)
$richxCam = @($allCams | Where-Object { $_ -match 'RICHX' })
$richxMic = @($audioEndpoints | Where-Object { $_ -match 'RICHX MIC' })
$knownVirtualCams = @($allCams | Where-Object { $_ -match 'OBS|Virtual|Camo|DroidCam|ManyCam|XSplit|NVIDIA Broadcast|VDO|IVCam|Droid|Unity|RICHX' })
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


// Native IPC Handlers for fal.ai Gateway (Fail-Safe: bypasses loopback port, firewall, and CORS)
ipcMain.handle("fal-token", async (event, { apiKey }) => {
  const falKey = (apiKey || process.env.FAL_KEY || process.env.VITE_FAL_KEY || "").trim();
  if (!falKey) {
    return {
      success: false,
      error: "Missing FAL_KEY. Please provide Key ID and Key Secret in Admin Dashboard (Ctrl+Shift+A) or server environment.",
    };
  }

  try {
    const authHeader = falKey.startsWith("Key ") ? falKey : `Key ${falKey}`;
    const response = await fetch("https://rest.fal.ai/tokens/", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowed_apps: ["decart/lucy-2-5", "decart/lucy-2-5/realtime", "lucy-2-5"],
        token_expiration: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        success: false,
        error: `fal.ai authentication error (${response.status}): ${errText || "Invalid credentials"}`,
      };
    }

    const data = await response.json();
    const token = typeof data === "string" ? data : data.token || data.detail || data;
    return { success: true, token, expires_in: 300 };
  } catch (err) {
    return { success: false, error: err.message || "Error generating fal.ai token" };
  }
});

ipcMain.handle("fal-upload-image", async (event, { apiKey, image, fileName = "avatar-identity.jpg" }) => {
  const falKey = (apiKey || process.env.FAL_KEY || process.env.VITE_FAL_KEY || "").trim();
  if (!image) {
    return { success: false, error: "Image data is required" };
  }
  if (!falKey) {
    return { success: true, file_url: image };
  }

  try {
    let mimeType = "image/jpeg";
    let base64Data = image;
    if (image.startsWith("data:")) {
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }
    const buffer = Buffer.from(base64Data, "base64");
    const authHeader = falKey.startsWith("Key ") ? falKey : `Key ${falKey}`;

    const initRes = await fetch("https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content_type: mimeType,
        file_name: fileName,
      }),
    });

    if (!initRes.ok) {
      return { success: true, file_url: image, warning: "Storage initiate failed, fallback to Data URI" };
    }

    const { upload_url, file_url } = await initRes.json();
    const putRes = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: buffer,
    });

    if (!putRes.ok) {
      return { success: true, file_url: image, warning: "Storage PUT failed" };
    }

    return { success: true, file_url };
  } catch (err) {
    return { success: true, file_url: image, warning: err.message };
  }
});

ipcMain.handle("fal-status", async () => {
  return {
    configured: Boolean(process.env.FAL_KEY || process.env.VITE_FAL_KEY),
    ready: true,
    model: "decart/lucy-2-5/realtime",
  };
});

ipcMain.handle("get-api-base-url", async () => {
  return API_BASE;
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    // Use a free loopback port when possible so a previous/zombie instance can
    // never block the bundled API server with EADDRINUSE.
    const envPort = process.env.RICHX_API_PORT;
    if (!envPort) {
      const freePort = await findFreePort();
      if (freePort > 0) {
        API_PORT = freePort;
        API_BASE = `http://127.0.0.1:${API_PORT}`;
      }
    }
    logApi(`starting bundled API server on port ${API_PORT}`);

    let ready = false;
    let spawned = startApiServer();
    if (spawned) {
      ready = await waitForApiServer(30000);
    }

    if (!ready) {
      logApi('first start attempt did not become ready; restarting bundled server...');
      if (apiServerProc) {
        try {
          apiServerProc.kill();
        } catch {}
        apiServerProc = null;
      }
      spawned = startApiServer();
      if (spawned) {
        ready = await waitForApiServer(20000);
      }
    }

    if (ready) {
      lastLoadUrl = `${API_BASE}/`;
    } else {
      logApi('bundled API server failed to start after retry');
      dialog.showErrorBox(
        'RICH X CAM LIVE — Video engine server failed to start',
        'The built-in API server did not start, so video calls cannot connect to fal.ai.\n\n' +
          'Close and reopen the app. If this keeps happening, reinstall RICH X CAM LIVE ' +
          'and allow it in your antivirus/firewall.'
      );
      lastLoadUrl = null;
      lastLoadOptions = { query: { apiOffline: '1' } };
    }

    createWindow(lastLoadUrl, lastLoadOptions);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(lastLoadUrl, lastLoadOptions);
      }
    });
  });
}

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
