import express, { Request, Response } from 'express';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// In the esbuild CJS bundle __dirname is provided by the CommonJS wrapper;
// under tsx/ESM it is undefined, so derive it from import.meta.url instead.
const SERVER_DIR =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to resolve effective FAL_KEY
function getEffectiveFalKey(req: Request): string {
  const headerKey = req.headers['x-fal-key'] as string;
  if (headerKey && headerKey.trim()) {
    return headerKey.trim();
  }
  const envKey = process.env.FAL_KEY || process.env.VITE_FAL_KEY || '';
  return envKey.trim();
}

/**
 * GET /api/fal/status
 * Check if a server-side FAL_KEY is configured
 */
app.get('/api/fal/status', (req: Request, res: Response) => {
  const hasEnvKey = Boolean(process.env.FAL_KEY || process.env.VITE_FAL_KEY);
  res.json({
    configured: hasEnvKey,
    model: 'decart/lucy-2-5/realtime',
    message: hasEnvKey
      ? 'FAL_KEY is configured on the server.'
      : 'No FAL_KEY detected in server environment. Keys can also be provided via the Admin Dashboard.',
  });
});

/**
 * POST /api/fal/token
 * Generate short-lived JWT token for Decart LUCY 2.5 Realtime
 * Following the official fal.ai short-lived client token authentication pattern
 */
app.post('/api/fal/token', async (req: Request, res: Response) => {
  const falKey = getEffectiveFalKey(req);
  if (!falKey) {
    return res.status(401).json({
      error: 'Missing FAL_KEY. Please configure FAL_KEY in your environment or enter it in the Admin Dashboard.',
    });
  }

  try {
    const response = await fetch('https://rest.fal.ai/tokens/', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allowed_apps: ['decart/lucy-2-5', 'decart/lucy-2-5/realtime'],
        token_expiration: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `fal.ai token error (${response.status}): ${errText}`,
      });
    }

    const data = await response.json();
    const token = typeof data === 'string' ? data : data.token || data.detail || data;
    return res.json({ token, expires_in: 300 });
  } catch (err: any) {
    console.error('Failed to create fal.ai temporary token', err);
    return res.status(500).json({ error: err.message || 'Internal server error generating token' });
  }
});

/**
 * POST /api/fal/upload-image
 * Uploads an avatar/identity image to fal.ai CDN storage
 * Converts base64 data URIs into hosted URLs required by the decart/lucy-2-5/realtime model
 */
app.post('/api/fal/upload-image', async (req: Request, res: Response) => {
  const falKey = getEffectiveFalKey(req);
  const { image, fileName = 'avatar-identity.jpg' } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  // If already a remote HTTPS URL hosted on fal CDN or similar, return directly
  if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
    return res.json({ file_url: image });
  }

  if (!falKey) {
    // If no FAL_KEY, return the data URI directly as fallback
    // (LUCY 2.5 accepts data URIs as well as URLs per fal.ai schema)
    return res.json({ file_url: image, warning: 'No FAL_KEY configured, using inline Data URI' });
  }

  try {
    // Parse base64
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Initiate upload with fal CDN v3
    const initRes = await fetch('https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content_type: mimeType,
        file_name: fileName,
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.warn('fal storage initiate failed, returning data URI:', errText);
      return res.json({ file_url: image, warning: 'Storage upload failed, falling back to Data URI' });
    }

    const initData = await initRes.json();
    const { upload_url, file_url } = initData;

    // 2. PUT binary to upload_url
    const putRes = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: buffer,
    });

    if (!putRes.ok) {
      console.warn('fal storage PUT failed, falling back to data URI');
      return res.json({ file_url: image, warning: 'Storage PUT failed, falling back to Data URI' });
    }

    return res.json({ file_url });
  } catch (err: any) {
    console.error('Failed to upload image to fal storage', err);
    return res.json({ file_url: image, warning: err.message });
  }
});

/**
 * POST /api/fal/webrtc-handshake
 * Server-side WebRTC SDP exchange proxy for decart/lucy-2-5/realtime
 * Enables SDP negotiation without exposing permanent API keys
 */
app.post('/api/fal/webrtc-handshake', async (req: Request, res: Response) => {
  const falKey = getEffectiveFalKey(req);
  if (!falKey) {
    return res.status(401).json({
      error: 'Missing FAL_KEY. Please configure FAL_KEY in your environment or enter it in the Admin Dashboard.',
    });
  }

  const { sdp, type = 'offer', prompt = '', reference_image_url = '' } = req.body;

  if (!sdp) {
    return res.status(400).json({ error: 'SDP offer is required' });
  }

  try {
    const authHeader = falKey.startsWith('Key ') ? falKey : `Key ${falKey}`;
    const payload: Record<string, any> = {
      sdp,
      type,
      prompt: prompt || 'Professional video call',
      enable_prompt_expansion: true,
    };

    if (reference_image_url) {
      payload.reference_image_url = reference_image_url;
      payload.image_url = reference_image_url;
    }

    const response = await fetch('https://fal.run/decart/lucy-2-5/realtime', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`fal.run/decart/lucy-2-5/realtime returned ${response.status}:`, errText);
      return res.status(response.status).json({
        error: `fal.ai LUCY 2.5 returned ${response.status}: ${errText}`,
      });
    }

    const result = await response.json();
    const answerSdp =
      result.sdp ||
      result.answer?.sdp ||
      result.candidate?.sdp ||
      (result.type === 'answer' && result.sdp ? result.sdp : null);

    return res.json({
      sdp: answerSdp,
      type: result.type || 'answer',
      raw: result,
    });
  } catch (err: any) {
    console.error('WebRTC handshake failed', err);
    return res.status(500).json({ error: err.message || 'WebRTC signaling failed' });
  }
});

/**
 * POST /api/license/validate-minutes
 * Backend validation for license minutes field.
 * Allows any valid number of minutes including 1, 2, 3, 4, 5, or any integer >= 1.
 */
app.post('/api/license/validate-minutes', (req: Request, res: Response) => {
  const { minutes, isUnlimited } = req.body;
  if (isUnlimited) {
    return res.json({ valid: true, minutes: 999999, message: 'Unlimited minutes approved' });
  }

  const minutesNum = Number(minutes);
  if (!Number.isFinite(minutesNum) || minutesNum < 1) {
    return res.status(400).json({
      valid: false,
      error: 'Minutes field must be at least 1 minute',
    });
  }

  return res.json({
    valid: true,
    minutes: Math.round(minutesNum),
    message: `Allocated minutes (${Math.round(minutesNum)}) accepted`,
  });
});

// Setup Vite middleware in development or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = process.env.RICHX_DIST_DIR
      ? process.env.RICHX_DIST_DIR
      : [path.join(SERVER_DIR, 'dist'), path.join(SERVER_DIR, '..', 'dist')].find((p) => existsSync(p)) ||
        path.join(SERVER_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RICH X CAM LIVE Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
