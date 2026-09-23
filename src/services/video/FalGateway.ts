declare global {
  interface Window {
    electronAPI?: {
      isElectron?: boolean;
      installVirtualDrivers?: () => Promise<{ success: boolean; message?: string }>;
      openSoundSettings?: () => Promise<{ success: boolean }>;
      openCameraSettings?: () => Promise<{ success: boolean }>;
      checkDriversStatus?: () => Promise<any>;
      falToken?: (apiKey: string) => Promise<{ success: boolean; token?: string; error?: string }>;
      falUploadImage?: (
        apiKey: string,
        image: string,
        fileName?: string
      ) => Promise<{ success: boolean; file_url?: string; warning?: string; error?: string }>;
      falStatus?: () => Promise<{ configured: boolean; ready: boolean; model?: string }>;
      getApiBaseUrl?: () => Promise<string>;
    };
  }
}

/**
 * Resolves a safe API endpoint URL, handling web, dev, and Electron file:// protocols.
 */
function getApiEndpoint(subpath: string): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // Under file://, relative paths fail with "Failed to parse URL from /api/...".
    // Fallback to loopback port used by the bundled Express server.
    return `http://127.0.0.1:3120${subpath.startsWith('/') ? '' : '/'}${subpath}`;
  }
  return subpath.startsWith('/') ? subpath : `/${subpath}`;
}

/**
 * Clean and format fal.ai API key to prevent any invalid header characters.
 */
export function sanitizeFalKey(rawKey: string): string {
  if (!rawKey) return '';
  let clean = rawKey.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

/**
 * Requests a short-lived client token for fal.ai LUCY 2.5 Realtime.
 * 1. Checks native Electron IPC (zero port, zero firewall dependency, fail-safe)
 * 2. Tries local server proxy route (/api/fal/token) with safe protocol resolution
 * 3. Falls back to direct official fal.ai CORS token minting if API key is provided
 */
export async function fetchFalClientToken(apiKey: string): Promise<string> {
  const cleanKey = sanitizeFalKey(apiKey);

  // 1. Electron Native IPC Path (Most reliable in packaged desktop app)
  if (typeof window !== 'undefined' && window.electronAPI?.falToken) {
    try {
      const ipcRes = await window.electronAPI.falToken(cleanKey);
      if (ipcRes && ipcRes.success && ipcRes.token) {
        return ipcRes.token;
      }
      if (ipcRes && ipcRes.error) {
        throw new Error(ipcRes.error);
      }
    } catch (ipcErr: any) {
      console.warn('[FalGateway] IPC token request failed, checking HTTP fallback:', ipcErr);
      if (ipcErr?.message && !ipcErr.message.includes('No handler')) {
        throw ipcErr;
      }
    }
  }

  // 2. Server Proxy Route (Standard Web & Dev server mode)
  try {
    const endpoint = getApiEndpoint('/api/fal/token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cleanKey) {
      headers['x-fal-key'] = cleanKey;
    }

    const tokenRes = await fetch(endpoint, {
      method: 'POST',
      headers,
    });

    if (tokenRes.ok) {
      const data = await tokenRes.json();
      if (data.token) {
        return data.token;
      }
    } else {
      const errJson = await tokenRes.json().catch(() => ({}));
      if (tokenRes.status === 401 || tokenRes.status === 403) {
        throw new Error(
          errJson.error ||
            'Missing or invalid FAL_KEY. Please verify your Key ID and Key Secret in Admin Dashboard (Ctrl+Shift+A).'
        );
      }
      if (cleanKey && (tokenRes.status === 404 || tokenRes.status === 502 || tokenRes.status === 503)) {
        // Fall through to direct call if server is not handling the route
      } else {
        throw new Error(errJson.error || `Authentication gateway error (HTTP ${tokenRes.status})`);
      }
    }
  } catch (fetchErr: any) {
    console.warn('[FalGateway] HTTP /api/fal/token fetch failed, evaluating direct client fallback:', fetchErr);
    if (!cleanKey) {
      throw new Error(
        fetchErr?.message ||
          'Could not reach API gateway. Please provide your fal.ai Key ID and Secret in Admin Dashboard (Ctrl+Shift+A).'
      );
    }
  }

  // 3. Direct Client-side Token Minting (Official fal.ai CORS endpoint)
  if (cleanKey) {
    const authHeader = cleanKey.startsWith('Key ') ? cleanKey : `Key ${cleanKey}`;
    const directRes = await fetch('https://rest.fal.ai/tokens/', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allowed_apps: ['decart/lucy-2-5', 'decart/lucy-2-5/realtime', 'lucy-2-5'],
        token_expiration: 300,
      }),
    });

    if (!directRes.ok) {
      const errText = await directRes.text().catch(() => '');
      throw new Error(
        `fal.ai authentication failed (${directRes.status}). Verify your Key ID and Key Secret: ${errText || 'Invalid credentials'}`
      );
    }

    const data = await directRes.json();
    const token = typeof data === 'string' ? data : data.token || data.detail || data;
    if (token) return token;
  }

  throw new Error('Could not obtain authentication token for fal.ai LUCY 2.5 Realtime.');
}

/**
 * Uploads a reference image to fal CDN or returns data URI/URL safely.
 */
export async function uploadReferenceImage(
  imageUrl: string,
  apiKey?: string
): Promise<string> {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('https://v3.fal.media') || imageUrl.startsWith('https://fal.media')) {
    return imageUrl;
  }

  const cleanKey = apiKey ? sanitizeFalKey(apiKey) : '';

  // 1. Electron IPC Path
  if (typeof window !== 'undefined' && window.electronAPI?.falUploadImage) {
    try {
      const res = await window.electronAPI.falUploadImage(
        cleanKey,
        imageUrl,
        `richx-avatar-${Date.now()}.jpg`
      );
      if (res && res.success && res.file_url) {
        return res.file_url;
      }
    } catch (err) {
      console.warn('[FalGateway] IPC upload image failed:', err);
    }
  }

  // 2. HTTP Proxy Route
  try {
    const endpoint = getApiEndpoint('/api/fal/upload-image');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cleanKey) {
      headers['x-fal-key'] = cleanKey;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: imageUrl,
        fileName: `richx-avatar-${Date.now()}.jpg`,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.file_url) {
        return data.file_url;
      }
    }
  } catch (err) {
    console.warn('[FalGateway] HTTP image upload failed, checking direct fal storage:', err);
  }

  // 3. Direct Storage Upload Fallback (CORS supported)
  if (cleanKey && imageUrl.startsWith('data:')) {
    try {
      let mimeType = 'image/jpeg';
      let base64Data = imageUrl;
      const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const authHeader = cleanKey.startsWith('Key ') ? cleanKey : `Key ${cleanKey}`;
      const initRes = await fetch('https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_type: mimeType,
          file_name: `richx-avatar-${Date.now()}.jpg`,
        }),
      });

      if (initRes.ok) {
        const { upload_url, file_url } = await initRes.json();
        const putRes = await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': mimeType },
          body: bytes,
        });
        if (putRes.ok && file_url) {
          return file_url;
        }
      }
    } catch (directErr) {
      console.warn('[FalGateway] Direct storage upload fallback failed:', directErr);
    }
  }

  // Fallback to image string directly
  return imageUrl;
}

/**
 * Verifies readiness of fal.ai gateway without throwing raw fetch parse errors.
 */
export async function checkGatewayReadiness(apiKey?: string): Promise<{ ready: boolean; message?: string }> {
  // 1. In Electron, check IPC readiness
  if (typeof window !== 'undefined' && window.electronAPI?.falStatus) {
    try {
      const st = await window.electronAPI.falStatus();
      if (st && st.ready) {
        return { ready: true };
      }
    } catch {}
  }

  // 2. If user has entered an API key, we are ready via direct client fallback
  if (apiKey && apiKey.trim().length > 5) {
    return { ready: true };
  }

  // 3. Otherwise probe the local server endpoint safely
  try {
    const endpoint = getApiEndpoint('/api/fal/status');
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      return { ready: true, message: data.message };
    }
  } catch {
    return {
      ready: false,
      message:
        'No active fal.ai credentials found. Please press Ctrl+Shift+A to configure fal.ai Key ID and Key Secret in the Admin Dashboard.',
    };
  }

  return { ready: true };
}
