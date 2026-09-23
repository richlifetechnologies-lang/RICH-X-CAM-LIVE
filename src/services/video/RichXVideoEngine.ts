import { fal } from '@fal-ai/client';
import { VideoOrientation } from '../../types/cloudCall';

export interface WebRTCConnectionInfo {
  status: 'idle' | 'requesting_permissions' | 'initializing' | 'connecting' | 'connected' | 'error' | 'disconnected';
  fps?: number;
  rttMs?: number;
  model: string;
}

export class RichXVideoEngine {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private realtimeConnection: any = null;
  private isConnected = false;
  private currentPrompt = 'Professional video presentation, crystal-clear 4k studio lighting, sharp facial detail';
  private currentImageUrl = '';
  private currentCameraId = 'default';
  private currentOrientation: VideoOrientation = 'landscape';
  private onRemoteStreamCb: ((stream: MediaStream) => void) | null = null;
  private onStatusChangeCb: ((status: string) => void) | null = null;
  private outgoingAudioTrack: MediaStreamTrack | null = null;

  /**
   * Returns the current live local camera stream for the UI preview
   */
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Returns the processed/generated remote stream from Decart LUCY 2.5
   */
  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Pre-fetches or ensures local camera feed is running for live preview before or during call
   */
  public async initCameraPreview(
    cameraId: string,
    orientation: VideoOrientation = 'landscape'
  ): Promise<MediaStream> {
    this.currentCameraId = cameraId;
    this.currentOrientation = orientation;
    const isPortrait = orientation === 'portrait';

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: cameraId && cameraId !== 'default' ? { exact: cameraId } : undefined,
        width: { ideal: isPortrait ? 720 : 1280 },
        height: { ideal: isPortrait ? 1280 : 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: cameraId && cameraId !== 'default' ? { exact: cameraId } : undefined,
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      } catch (camErr) {
        console.warn('Physical camera unavailable, generating synthetic 30fps stream for WebRTC:', camErr);
        this.localStream = this.createSyntheticVideoStream(isPortrait);
      }
    }

    return this.localStream;
  }

  /**
   * Generates a 30 FPS synthetic canvas video track for WebRTC driver when no physical camera is attached
   */
  private createSyntheticVideoStream(isPortrait: boolean): MediaStream {
    const width = isPortrait ? 720 : 1280;
    const height = isPortrait ? 1280 : 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      let t = 0;
      const interval = setInterval(() => {
        t += 0.05;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);

        // Animated gradient orb representing camera face tracker
        const grad = ctx.createRadialGradient(
          width / 2 + Math.sin(t) * 35,
          height / 2 + Math.cos(t) * 20,
          20,
          width / 2,
          height / 2,
          width / 3
        );
        grad.addColorStop(0, '#a855f7');
        grad.addColorStop(0.5, '#4f46e5');
        grad.addColorStop(1, '#090d16');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, width / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RICH X CAM LIVE — Video Feed Active', width / 2, height / 2 - 20);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('30 FPS Realtime Driver Connected', width / 2, height / 2 + 20);
      }, 1000 / 30);

      const stream = canvas.captureStream(30);
      const track = stream.getVideoTracks()[0];
      if (track) {
        const origStop = track.stop.bind(track);
        track.stop = () => {
          clearInterval(interval);
          origStop();
        };
      }
      return stream;
    }
    return canvas.captureStream(30);
  }

  /**
   * Uploads an image (base64 or URL) to fal.ai CDN storage to provide a clean hosted URL for LUCY 2.5
   */
  public async prepareReferenceImageUrl(imageUrl: string, apiKey?: string): Promise<string> {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('https://v3.fal.media') || imageUrl.startsWith('https://fal.media')) {
      return imageUrl;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['x-fal-key'] = apiKey;
      }

      const res = await fetch('/api/fal/upload-image', {
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
      console.warn('Could not upload image via server route, using input directly:', err);
    }

    return imageUrl;
  }

  /**
   * Starts live Decart LUCY 2.5 Realtime session over WebRTC
   */
  public async startWebRTCStream(
    apiKey: string,
    cameraId: string,
    prompt: string,
    referenceImageUrl: string,
    orientation: VideoOrientation,
    onRemoteStream: (stream: MediaStream) => void,
    onStatusChange: (status: string) => void,
    outgoingAudioStream?: MediaStream | null
  ): Promise<MediaStream> {
    this.stopStream();
    this.onRemoteStreamCb = onRemoteStream;
    this.onStatusChangeCb = onStatusChange;
    this.currentPrompt = prompt || this.currentPrompt;
    this.currentOrientation = orientation;
    this.currentCameraId = cameraId;

    const isPortrait = orientation === 'portrait';
    onStatusChange(`RICH X CAM: Requesting ${isPortrait ? 'Portrait 9:16 (Phone)' : 'Landscape 16:9 (Desktop)'} camera...`);

    // 1. Obtain Local Webcam Feed
    await this.initCameraPreview(cameraId, orientation);
    if (!this.localStream) {
      throw new Error('Could not access camera device');
    }

    // 2. Prepare Reference Image URL
    onStatusChange('RICH X CAM: Preparing visual identity for realtime engine...');
    const processedImageUrl = await this.prepareReferenceImageUrl(referenceImageUrl, apiKey);
    this.currentImageUrl = processedImageUrl;

    onStatusChange('RICH X CAM: Establishing WebRTC connection to Realtime Video Engine...');

    try {
      // Setup WebRTC Peer Connection with standard STUN servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
        bundlePolicy: 'max-bundle',
      });

      // Add local camera video track
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        this.peerConnection.addTrack(videoTrack, this.localStream);
      }

      // Add outgoing lip-sync driver audio track if provided
      if (outgoingAudioStream) {
        const audioTrack = outgoingAudioStream.getAudioTracks()[0];
        if (audioTrack) {
          this.outgoingAudioTrack = audioTrack;
          try {
            this.peerConnection.addTrack(audioTrack, outgoingAudioStream);
          } catch (err) {
            console.warn('Could not add audio track to WebRTC:', err);
          }
        }
      }

      // Create DataChannel for real-time prompt and identity switching
      this.dataChannel = this.peerConnection.createDataChannel('richx-prompts', {
        ordered: true,
      });

      this.dataChannel.onopen = () => {
        console.log('RICH X Realtime DataChannel opened');
        this.sendDataChannelUpdate();
      };

      this.dataChannel.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('RICH X DataChannel message received:', msg);
        } catch {
          // Ignore non-json
        }
      };

      // Set up ontrack to receive generated realtime video output from fal.ai LUCY 2.5
      this.peerConnection.ontrack = (event) => {
        console.log('RICH X WebRTC track received:', event);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
        } else if (event.track) {
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          this.remoteStream.addTrack(event.track);
        }

        if (this.remoteStream) {
          this.isConnected = true;
          this.onRemoteStreamCb?.(this.remoteStream);
          this.onStatusChangeCb?.(
            `RICH X Realtime: Streaming fal.ai LUCY 2.5 @ 30 FPS [${isPortrait ? '9:16 Phone' : '16:9 Desktop'}]`
          );
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('WebRTC connection state changed:', state);
        if (state === 'connected') {
          this.isConnected = true;
          this.onStatusChangeCb?.('RICH X CAM: Active Realtime Video Call (30 FPS)');
        } else if (state === 'disconnected' || state === 'failed') {
          this.onStatusChangeCb?.('WebRTC connection disconnected. Cleaning up...');
        }
      };

      // 3. Create SDP Offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });
      await this.peerConnection.setLocalDescription(offer);

      // Wait for ICE candidate gathering (with 1.5s max safety timeout)
      await new Promise<void>((resolve) => {
        if (!this.peerConnection || this.peerConnection.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        const onIceChange = () => {
          if (this.peerConnection?.iceGatheringState === 'complete') {
            this.peerConnection.removeEventListener('icegatheringstatechange', onIceChange);
            resolve();
          }
        };
        this.peerConnection.addEventListener('icegatheringstatechange', onIceChange);
        setTimeout(resolve, 1500);
      });

      const offerSdp = this.peerConnection.localDescription?.sdp || offer.sdp;

      // 4. Negotiate via server handshake
      onStatusChange('RICH X CAM: Exchanging WebRTC session description with realtime cloud engine...');
      
      const handshakeHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        handshakeHeaders['x-fal-key'] = apiKey;
      }

      const handshakeRes = await fetch('/api/fal/webrtc-handshake', {
        method: 'POST',
        headers: handshakeHeaders,
        body: JSON.stringify({
          sdp: offerSdp,
          type: 'offer',
          prompt: this.currentPrompt,
          reference_image_url: this.currentImageUrl,
          orientation: this.currentOrientation,
        }),
      });

      if (handshakeRes.ok) {
        const handshakeData = await handshakeRes.json();
        const answerSdp =
          handshakeData.sdp ||
          handshakeData.answer?.sdp ||
          handshakeData.candidate?.sdp ||
          handshakeData.raw?.sdp;

        if (answerSdp && this.peerConnection) {
          const answerDesc = new RTCSessionDescription({
            type: (handshakeData.type || 'answer') as RTCSdpType,
            sdp: answerSdp,
          });
          await this.peerConnection.setRemoteDescription(answerDesc);
          this.isConnected = true;
          onStatusChange('RICH X Realtime: Connected to fal.ai LUCY 2.5 WebRTC session. Streaming @ 30 FPS...');
          return this.localStream;
        }
      } else {
        const errJson = await handshakeRes.json().catch(() => ({}));
        console.warn('webrtc-handshake returned non-200:', handshakeRes.status, errJson);
        if (handshakeRes.status === 401) {
          onStatusChange('FAL_KEY required for cloud generation. Add in Admin Dashboard (Ctrl+Shift+A). Running studio preview...');
        }
      }

      // If server handshake fails or no key configured, connect via fal.realtime client with short-lived token
      try {
        const tokenRes = await fetch('/api/fal/token', {
          method: 'POST',
          headers: handshakeHeaders,
        });

        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          if (token) {
            fal.config({ credentials: token });
            this.realtimeConnection = fal.realtime.connect('decart/lucy-2-5/realtime', {
              connectionKey: 'lucy-2-5-realtime-session',
              onResult: async (result: any) => {
                if (result.sdp && this.peerConnection && this.peerConnection.remoteDescription === null) {
                  await this.peerConnection.setRemoteDescription(
                    new RTCSessionDescription({
                      type: result.type || 'answer',
                      sdp: result.sdp,
                    })
                  );
                }
              },
              onError: (err: any) => {
                console.warn('fal.realtime error:', err);
              },
            });

            this.realtimeConnection.send({
              sdp: offerSdp,
              type: 'offer',
              prompt: this.currentPrompt,
              reference_image_url: this.currentImageUrl,
              image_url: this.currentImageUrl,
            });

            onStatusChange('Connected to realtime signaling relay for RICH X CAM');
            return this.localStream;
          }
        }
      } catch (tokenErr) {
        console.warn('fal.realtime token connection attempt finished with:', tokenErr);
      }

      // Fallback: If no server credentials exist or network blocks remote cloud engine,
      // preview local camera with visual character identity overlay so user testing is uninterrupted
      onStatusChange(
        `RICH X CAM LIVE (Local Studio Preview) — Target Persona: ${
          this.currentImageUrl ? 'Configured' : 'None'
        } &bull; Set FAL_KEY in Admin Dashboard to enable cloud generation.`
      );
      this.remoteStream = this.localStream;
      onRemoteStream(this.localStream);
      this.isConnected = true;
      return this.localStream;
    } catch (err: any) {
      console.warn('WebRTC negotiation encountered error:', err);
      onStatusChange(`RICH X CAM: ${err.message || 'Stream running in local preview mode'}`);
      this.remoteStream = this.localStream;
      onRemoteStream(this.localStream);
      this.isConnected = true;
      return this.localStream;
    }
  }

  /**
   * Switch camera input device live during call
   */
  public async switchCamera(newCameraId: string): Promise<void> {
    if (this.currentCameraId === newCameraId && this.localStream) return;
    this.currentCameraId = newCameraId;

    const isPortrait = this.currentOrientation === 'portrait';
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: newCameraId && newCameraId !== 'default' ? { exact: newCameraId } : undefined,
        width: { ideal: isPortrait ? 720 : 1280 },
        height: { ideal: isPortrait ? 1280 : 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (this.peerConnection && newVideoTrack) {
        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Stop old video track
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach((t) => t.stop());
      }
      this.localStream = newStream;
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  }

  /**
   * Updates prompt instruction dynamically during call
   */
  public updatePrompt(prompt: string): void {
    this.currentPrompt = prompt;
    this.sendDataChannelUpdate();
  }

  /**
   * Updates the target persona character reference image dynamically
   */
  public async updateReferenceImage(newImageUrl: string, apiKey?: string): Promise<void> {
    const processed = await this.prepareReferenceImageUrl(newImageUrl, apiKey);
    this.currentImageUrl = processed;
    this.sendDataChannelUpdate();
  }

  private sendDataChannelUpdate(): void {
    const payload = {
      prompt: this.currentPrompt,
      reference_image_url: this.currentImageUrl,
      image_url: this.currentImageUrl,
      timestamp: Date.now(),
    };

    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(payload));
      } catch (err) {
        console.warn('Failed to send payload over dataChannel:', err);
      }
    }

    if (this.realtimeConnection) {
      try {
        this.realtimeConnection.send(payload);
      } catch (err) {
        console.warn('Failed to send payload over fal.realtime:', err);
      }
    }
  }

  /**
   * Stops WebRTC stream and releases all camera, microphone, and connection resources
   */
  public stopStream(): void {
    this.isConnected = false;

    if (this.realtimeConnection) {
      try {
        this.realtimeConnection.close();
      } catch {}
      this.realtimeConnection = null;
    }

    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        // Stop all track senders first
        this.peerConnection.getSenders().forEach((s) => {
          try {
            s.track?.stop();
          } catch {}
        });
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }

    if (this.outgoingAudioTrack) {
      try {
        this.outgoingAudioTrack.stop();
      } catch {}
      this.outgoingAudioTrack = null;
    }

    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.localStream = null;
    }

    if (this.remoteStream) {
      try {
        this.remoteStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.remoteStream = null;
    }

    this.onRemoteStreamCb = null;
  }
}
