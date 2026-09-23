const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  installVirtualDrivers: () => ipcRenderer.invoke('install-virtual-drivers'),
  openSoundSettings: () => ipcRenderer.invoke('open-sound-settings'),
  openCameraSettings: () => ipcRenderer.invoke('open-camera-settings'),
  checkDriversStatus: () => ipcRenderer.invoke('check-drivers-status'),
});
