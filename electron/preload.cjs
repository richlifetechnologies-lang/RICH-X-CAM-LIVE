const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  installVirtualDrivers: () => ipcRenderer.invoke('install-virtual-drivers'),
  openSoundSettings: () => ipcRenderer.invoke('open-sound-settings'),
  openCameraSettings: () => ipcRenderer.invoke('open-camera-settings'),
  checkDriversStatus: () => ipcRenderer.invoke('check-drivers-status'),
  falToken: (apiKey) => ipcRenderer.invoke('fal-token', { apiKey }),
  falUploadImage: (apiKey, image, fileName) =>
    ipcRenderer.invoke('fal-upload-image', { apiKey, image, fileName }),
  falStatus: () => ipcRenderer.invoke('fal-status'),
  getApiBaseUrl: () => ipcRenderer.invoke('get-api-base-url'),
});
