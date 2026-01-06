const { contextBridge, ipcRenderer } = require('electron')

// Expose secure APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Notifications
  showNotification: (title, body, type = 'info') => {
    ipcRenderer.send('show-notification', { title, body, type })
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  // Deployment updates (for overlay)
  onDeploymentUpdate: (callback) => {
    ipcRenderer.on('deployment-update', (event, deployments) => callback(deployments))
  },

  // App info
  isElectron: true,
  platform: process.platform,
})
