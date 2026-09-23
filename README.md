# RICH X CAM LIVE

**RICH X CAM LIVE** is a professional desktop application for real-time video transformation and speech-to-speech voice conversion during live audio and video calls.

---

## Universal Calling Apps Support

Because **`RICHX CAM`** and **`RICHX MIC`** register at the Windows Kernel system level (DirectShow / MediaFoundation / WASAPI), they are recognized as real physical hardware by **any calling application on Windows**, including:

* **WhatsApp (Desktop & Web Calls)** — Fully supports Portrait (9:16) phone calls and Landscape.
* **Telegram Desktop & Web Calls**
* **WeChat Desktop**
* **Google Chat & Google Meet**
* **Discord & Slack**
* **Zoom & Microsoft Teams**
* **Skype, Viber, Signal**
* **Any web browser or unknown/future calling software**

---

## Key Features

1. **RICHX CAM Virtual Camera Output:**
   - Appears in all calling software as a native camera device named **`RICHX CAM`**.
   - Supports one-click **Portrait Mode (9:16 Phone style)** and **Landscape Mode (16:9 Desktop webcam)**.
   - Ultra-low latency 720p 30FPS real-time video rendering.

2. **RICHX Synchronized Audio Pipeline:**
   - Upload any voice sample (MP3 / WAV) to generate and use custom voice profiles in real time.
   - Natural Microphone mode with customizable lip-sync latency alignment so mouth movements match spoken words.
   - Routes directly into calling apps via the bundled virtual audio bridge named **`RICHX MIC`**.

3. **All-In-One Bundled Windows Installer:**
   - Bundles the virtual DirectShow camera filter (`richxcam64.dll`) and virtual audio cable setup directly into the installer.
   - Users don't need to manually configure external driver tools — running the setup configures **RICHX CAM** and **RICHX MIC** automatically.

---

## Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Run local web development server
npm run dev

# 3. Build production web bundle
npm run build
```

---

## Desktop Packaging (Windows Installer)

To package as a standalone Windows `.exe` installer with bundled drivers:

```bash
# Package Windows NSIS installer
npm run electron:build
```
The output installer will be created inside the `dist/` directory.
