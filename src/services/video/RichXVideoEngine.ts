import { fal } from '@fal-ai/client';
import { VideoOrientation } from '../../types/cloudCall';

export interface WebRTCConnectionInfo {
  status:
    | 'idle'
    | 'requesting_permissions'
    | 'initializing'
    | 'connecting'
    | 'connected'
    | 'error'
    | 'disconnected';
  fps?: number;
  rttMs?: number;
  model: string;
}

export class RichXVideoEngine {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private realtimeConnection: any = null;
  private isConnected = false;
  private currentPrompt =
    'Professional video presentation, crystal-clear 4k studio lighting, sharp facial detail';
  private currentImageUrl = '';
  private currentCameraId = 'default';
  private currentOrientation: VideoOrientation = 'landscape';
  private onRemoteStreamCb: ((stream: MediaStream) => void) | null = null;
  private onStatusChangeCb: ((status: string) => void) | null = null;
  private outgoingAudioTrack: MediaStreamTrack | null = null;
  private realtimeError: string | null = null;

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
   * Starts live Decart LUCY 2.5 Realtime session over WebRTC.
   * Connects via fal.ai WebSocket signaling relay with MsgPack framing.
   * Negotiates ICE servers, SDP offer/answer, and Trickle ICE.
   * Resolves only once the genuine fal.ai generated video stream is flowing.
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
  ): Promise<void> {
    this.stopStream();
    this.onRemoteStreamCb = onRemoteStream;
    this.onStatusChangeCb = onStatusChange;
    this.realtimeError = null;
    this.currentPrompt = prompt || this.currentPrompt;
    this.currentOrientation = orientation;
    this.currentCameraId = cameraId;

    const isPortrait = orientation === 'portrait';
    onStatusChange(
      `RICH X CAM: Requesting ${isPortrait ? 'Portrait 9:16 (Phone)' : 'Landscape 16:9 (Desktop)'} camera...`
    );

    // 1. Obtain Local Webcam Feed
    await this.initCameraPreview(cameraId, orientation);
    if (!this.localStream) {
      throw new Error('Could not access camera device');
    }

    // 2. Prepare Reference Image URL
    onStatusChange('RICH X CAM: Preparing visual identity for realtime engine...');
    const processedImageUrl = await this.prepareReferenceImageUrl(referenceImageUrl, apiKey);
    this.currentImageUrl = processedImageUrl;

    // 3. Mint short-lived client token from server proxy
    onStatusChange('RICH X CAM: Authenticating with fal.ai realtime gateway...');
    const handshakeHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
      handshakeHeaders['x-fal-key'] = apiKey.trim();
    }

    const tokenRes = await fetch('/api/fal/token', {
      method: 'POST',
      headers: handshakeHeaders,
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      if (tokenRes.status === 401 || tokenRes.status === 403) {
        throw new Error(
          errJson.error ||
            'Missing or invalid FAL_KEY. Please provide both Key ID and Key Secret in the Admin Dashboard (Ctrl+Shift+A) or server environment.'
        );
      }
      throw new Error(
        errJson.error || `fal.ai authentication failed with status ${tokenRes.status}`
      );
    }

    const { token } = await tokenRes.json();
    if (!token) {
      throw new Error('Received invalid authentication response from fal.ai gateway.');
    }

    onStatusChange('RICH X CAM: Connecting to fal.ai LUCY 2.5 Realtime signaling relay...');

    try {
      // Configure client token
      fal.config({ credentials: token });

      // State tracking for the WebRTC offer/answer and Trickle ICE lifecycle
      let isReady = false;
      let isAnswered = false;
      const queuedRemoteCandidates: RTCIceCandidateInit[] = [];

      // Generate a unique connection key per session to prevent stale interpreter caching
      const sessionUUID =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      const connectionKey = `lucy-${sessionUUID}`;

      // Handler for messages received over the fal.realtime WebSocket signaling channel
      const handleSignalingMessage = async (msg: any) => {
        if (!msg) return;
        const msgType = String(msg.type || '').toLowerCase();

        // A. READY message with ICE servers from Decart / fal.ai
        if (msgType === 'ready' || msg.iceServers || msg.ice_servers || msg.iceservers) {
          if (isReady) return;
          isReady = true;

          const rawIce = msg.iceServers || msg.ice_servers || msg.iceservers;
          const iceServers: RTCIceServer[] =
            Array.isArray(rawIce) && rawIce.length > 0
              ? rawIce
              : [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'stun:global.stun.twilio.com:3478' },
                ];

          onStatusChange('RICH X CAM: Initializing WebRTC PeerConnection with cloud relay...');

          this.peerConnection = new RTCPeerConnection({
            iceServers,
            bundlePolicy: 'max-bundle',
          });

          // Add local camera video track
          const videoTrack = this.localStream?.getVideoTracks()[0];
          if (videoTrack && this.localStream) {
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
                console.warn('Could not add outgoing audio track to WebRTC:', err);
              }
            }
          }

          // Handle incoming remote media tracks (Video + Audio from LUCY 2.5)
          this.peerConnection.ontrack = (event) => {
            console.log('RICH X WebRTC track received:', event.track.kind, event);
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
                `RICH X Realtime: Streaming fal.ai LUCY 2.5 @ 30 FPS [${
                  isPortrait ? '9:16 Phone' : '16:9 Desktop'
                }]`
              );
            }
          };

          // Forward local ICE candidates to fal.ai over WebSocket signaling
          this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.realtimeConnection) {
              try {
                this.realtimeConnection.send({
                  type: 'icecandidate',
                  candidate: {
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                  },
                });
              } catch (err) {
                console.warn('Failed to forward ICE candidate to fal.ai:', err);
              }
            }
          };

          this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState;
            console.log('WebRTC connection state changed:', state);
            if (state === 'connected') {
              this.isConnected = true;
              this.onStatusChangeCb?.('RICH X CAM: Active Realtime Video Call (30 FPS)');
            } else if (state === 'disconnected' || state === 'failed') {
              this.isConnected = false;
              this.onStatusChangeCb?.('WebRTC connection disconnected. Cleaning up...');
            }
          };

          // Create SDP Offer
          onStatusChange('RICH X CAM: Negotiating WebRTC SDP offer with LUCY 2.5...');
          const offer = await this.peerConnection.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
          await this.peerConnection.setLocalDescription(offer);

          if (offer.sdp && this.realtimeConnection) {
            this.realtimeConnection.send({
              type: 'offer',
              sdp: offer.sdp,
            });
          }
          return;
        }

        // B. ANSWER message with remote SDP from fal.ai / Decart
        if (msgType === 'answer' || msg.sdp) {
          const answerSdp = msg.sdp || msg.answer?.sdp;
          if (answerSdp && this.peerConnection && !isAnswered) {
            isAnswered = true;
            onStatusChange('RICH X CAM: Exchanging WebRTC session description with realtime cloud engine...');
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription({
                type: 'answer',
                sdp: answerSdp,
              })
            );

            // Flush any queued remote ICE candidates received before answer
            while (queuedRemoteCandidates.length > 0) {
              const cand = queuedRemoteCandidates.shift();
              if (cand && this.peerConnection) {
                try {
                  await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                  console.warn('Failed to add queued remote ICE candidate:', e);
                }
              }
            }
          }
          return;
        }

        // C. Remote Trickle ICE candidate received from server
        if (msgType === 'icecandidate' || msg.candidate) {
          const cand = msg.candidate;
          if (cand) {
            if (this.peerConnection && isAnswered) {
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('Failed to add remote ICE candidate:', e);
              }
            } else {
              queuedRemoteCandidates.push(cand);
            }
          }
          return;
        }

        // D. Error message from signaling server
        if (msgType === 'error' || msg.error) {
          const errDetail =
            msg.error?.message ||
            msg.message ||
            (typeof msg.error === 'string' ? msg.error : 'Signaling error reported by fal.ai');
          this.realtimeError = errDetail;
          console.error('LUCY 2.5 realtime signaling reported error:', errDetail);
        }
      };

      // Connect to fal.ai realtime endpoint
      this.realtimeConnection = fal.realtime.connect('decart/lucy-2-5/realtime', {
        connectionKey,
        tokenProvider: () => Promise.resolve(token),
        onResult: (result: any) => {
          handleSignalingMessage(result).catch((err) => {
            console.warn('Error processing signaling message:', err);
          });
        },
        onError: (err: any) => {
          this.realtimeError = err?.message || String(err);
          console.warn('fal.realtime connection error:', err);
        },
        throttleInterval: 0,
      });

      // Send initial configuration message immediately upon connecting
      const initialInput: Record<string, any> = {
        prompt: this.currentPrompt || 'Professional video call presentation',
        enable_prompt_expansion: true,
      };
      if (this.currentImageUrl) {
        initialInput.reference_image_url = this.currentImageUrl;
        initialInput.image_url = this.currentImageUrl;
      }

      this.realtimeConnection.send(initialInput);
      onStatusChange('Connected to realtime signaling relay for RICH X CAM');

      // Wait for the remote generated media stream to arrive
      await this.waitForRemoteStream(20000);
    } catch (err: any) {
      console.error('WebRTC negotiation failed:', err);
      this.stopStream();
      if (err instanceof Error) throw err;
      throw new Error(
        String(err?.message || err || 'Failed to connect to fal.ai LUCY 2.5 realtime engine')
      );
    }
  }

  /**
   * Resolves once the genuine fal.ai generated remote video track arrives.
   * Never resolves with the local camera — connection problems reject instead.
   */
  private waitForRemoteStream(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const poll = () => {
        if (this.isConnected && this.remoteStream) {
          resolve();
          return;
        }
        if (this.realtimeError) {
          reject(new Error(`fal.ai realtime engine error: ${this.realtimeError}`));
          return;
        }
        const pcState = this.peerConnection?.connectionState;
        if (pcState === 'failed' || pcState === 'closed') {
          reject(
            new Error(
              'WebRTC connection to fal.ai failed or closed before the generated stream arrived.'
            )
          );
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          reject(
            new Error(
              'Timed out waiting for the generated video stream from fal.ai LUCY 2.5. Verify your FAL_KEY is valid, has billing enabled, and that your network allows WebRTC, then try again.'
            )
          );
          return;
        }
        setTimeout(poll, 250);
      };
      poll();
    });
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
    const payload: Record<string, any> = {
      prompt: this.currentPrompt,
      enable_prompt_expansion: true,
      timestamp: Date.now(),
    };
    if (this.currentImageUrl) {
      payload.reference_image_url = this.currentImageUrl;
      payload.image_url = this.currentImageUrl;
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
    this.realtimeError = null;

    if (this.realtimeConnection) {
      try {
        this.realtimeConnection.close();
      } catch {}
      this.realtimeConnection = null;
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
