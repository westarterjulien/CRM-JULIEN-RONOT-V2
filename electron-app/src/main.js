const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, shell, dialog } = require('electron')
const path = require('path')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')

// Configuration store
const store = new Store({
  defaults: {
    crmUrl: 'https://crm.julienronot.fr',
    minimizeToTray: true,
    startMinimized: false,
    notifications: true,
    deploymentOverlay: true,
  }
})

let mainWindow = null
let deploymentWindow = null
let tray = null
let isQuitting = false
let activeDeployments = []
let deploymentPollInterval = null

// CRM URL
const CRM_URL = store.get('crmUrl')

// Auto-updater configuration
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function setupAutoUpdater() {
  // Check for updates silently
  autoUpdater.checkForUpdates().catch(() => {})

  // Update available
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version)
    sendNotification(
      'Mise à jour disponible',
      `Version ${info.version} en cours de téléchargement...`,
      'info'
    )
  })

  // Update downloaded - prompt to restart
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version)

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise à jour prête',
      message: `La version ${info.version} est prête à être installée.`,
      detail: 'L\'application va redémarrer pour appliquer la mise à jour.',
      buttons: ['Redémarrer maintenant', 'Plus tard'],
      defaultId: 0,
    }).then((result) => {
      if (result.response === 0) {
        isQuitting = true
        autoUpdater.quitAndInstall(false, true)
      }
    })
  })

  // Error handling
  autoUpdater.on('error', (err) => {
    console.log('[AutoUpdater] Error:', err.message)
  })

  // Check for updates every 30 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 30 * 60 * 1000)
}

// Create main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '../build/icon.png'),
    title: 'CRM Luelis',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
    },
    show: !store.get('startMinimized'),
    backgroundColor: '#F5F5F7',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
  })

  // Remove menu bar on Windows (keep on macOS for system integration)
  if (process.platform !== 'darwin') {
    mainWindow.setMenu(null)
  }

  // Load CRM
  mainWindow.loadURL(CRM_URL)

  // Inject polling script when page is ready
  mainWindow.webContents.on('did-finish-load', () => {
    injectDeploymentPolling()
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(CRM_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Handle close to tray
  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('minimizeToTray')) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Create deployment overlay window
function createDeploymentWindow(deploymentCount = 1) {
  // Calculate height based on number of deployments
  // Header: 50px, Each deployment: 45px, Progress bar: 20px, Padding: 35px
  const baseHeight = 105
  const perDeploymentHeight = 45
  const height = Math.min(baseHeight + (deploymentCount * perDeploymentHeight), 400)

  if (deploymentWindow) {
    // Resize existing window
    const [width] = deploymentWindow.getSize()
    deploymentWindow.setSize(width, height)
    return
  }

  deploymentWindow = new BrowserWindow({
    width: 340,
    height: height,
    x: 20,
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  deploymentWindow.loadFile(path.join(__dirname, 'deployment-overlay.html'))
  deploymentWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  deploymentWindow.on('closed', () => {
    deploymentWindow = null
  })
}

// Show deployment overlay with data
function showDeploymentOverlay(deployments) {
  if (!store.get('deploymentOverlay')) return

  const count = deployments.length

  // Check if window was destroyed
  if (deploymentWindow && deploymentWindow.isDestroyed()) {
    deploymentWindow = null
  }

  if (!deploymentWindow) {
    createDeploymentWindow(count)
    deploymentWindow.webContents.once('did-finish-load', () => {
      if (deploymentWindow && !deploymentWindow.isDestroyed()) {
        deploymentWindow.webContents.send('deployment-update', deployments)
        deploymentWindow.show()
      }
    })
  } else {
    // Resize window based on deployment count
    createDeploymentWindow(count)

    // Ensure webContents is ready before sending
    if (deploymentWindow.webContents && !deploymentWindow.webContents.isDestroyed()) {
      deploymentWindow.webContents.send('deployment-update', deployments)
    }

    // Always try to show the window
    if (!deploymentWindow.isVisible()) {
      deploymentWindow.show()
    }
  }
}

// Hide deployment overlay
function hideDeploymentOverlay() {
  if (deploymentWindow) {
    deploymentWindow.hide()
  }
}

// Handle deployment updates from renderer
function handleDeploymentUpdate(deployments) {
  const runningDeployments = deployments.filter(d => d.status === 'running')

  // Show overlay if there are running deployments
  if (runningDeployments.length > 0) {
    showDeploymentOverlay(runningDeployments)
  } else {
    hideDeploymentOverlay()
  }

  // Check for completed deployments
  for (const prev of activeDeployments) {
    const current = deployments.find(d => d.id === prev.id)
    if (current && prev.status === 'running' && current.status !== 'running') {
      // Deployment finished - send notification
      sendNotification(
        current.status === 'done' ? 'Déploiement réussi' : 'Déploiement échoué',
        `${current.appName} - ${current.projectName}`,
        current.status === 'done' ? 'success' : 'error'
      )
    }
  }

  activeDeployments = deployments
}

// Inject polling script into the page
function injectDeploymentPolling() {
  const script = `
    (function() {
      if (window.__electronDeploymentPolling) return;
      window.__electronDeploymentPolling = true;

      let lastDeployments = [];

      async function pollDeployments() {
        try {
          const res = await fetch('/api/deployments/status');
          if (!res.ok) return;
          const data = await res.json();
          const deployments = data.deployments || [];

          // Send to main process
          if (window.electronAPI) {
            window.electronAPI.sendDeployments(deployments);
          }

          lastDeployments = deployments;
        } catch (e) {
          console.log('Deployment poll error:', e);
        }
      }

      // Poll every 3 seconds for faster detection
      pollDeployments();
      setInterval(pollDeployments, 3000);
      console.log('[Electron] Deployment polling started (3s interval)');
    })();
  `;

  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(script).catch(() => {})
  }
}

// Send system notification
function sendNotification(title, body, type = 'info') {
  if (!store.get('notifications')) return
  if (!Notification.isSupported()) return

  const iconName = type === 'success' ? 'notification-success.png'
                 : type === 'error' ? 'notification-error.png'
                 : 'notification-info.png'

  const notification = new Notification({
    title,
    body,
    icon: path.join(__dirname, '../build', iconName),
    silent: false,
  })

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  notification.show()
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, '../build/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir CRM Luelis',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Notifications',
      type: 'checkbox',
      checked: store.get('notifications'),
      click: (item) => {
        store.set('notifications', item.checked)
      }
    },
    {
      label: 'Overlay Deployments',
      type: 'checkbox',
      checked: store.get('deploymentOverlay'),
      click: (item) => {
        store.set('deploymentOverlay', item.checked)
        if (!item.checked) hideDeploymentOverlay()
      }
    },
    {
      label: 'Minimiser dans le tray',
      type: 'checkbox',
      checked: store.get('minimizeToTray'),
      click: (item) => {
        store.set('minimizeToTray', item.checked)
      }
    },
    { type: 'separator' },
    {
      label: 'Vérifier les mises à jour',
      click: () => {
        autoUpdater.checkForUpdates().then((result) => {
          if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
            sendNotification('Aucune mise à jour', 'Vous utilisez la dernière version.', 'info')
          }
        }).catch(() => {
          sendNotification('Erreur', 'Impossible de vérifier les mises à jour.', 'error')
        })
      }
    },
    {
      label: `Version ${app.getVersion()}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('CRM Luelis')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

// IPC handlers
ipcMain.handle('get-settings', () => {
  return {
    notifications: store.get('notifications'),
    deploymentOverlay: store.get('deploymentOverlay'),
    minimizeToTray: store.get('minimizeToTray'),
  }
})

ipcMain.handle('set-setting', (event, key, value) => {
  store.set(key, value)
  return true
})

ipcMain.on('show-notification', (event, { title, body, type }) => {
  sendNotification(title, body, type)
})

ipcMain.on('deployment-update', (event, deployments) => {
  handleDeploymentUpdate(deployments)
})

// App lifecycle
app.whenReady().then(() => {
  createMainWindow()
  createTray()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  if (deploymentPollInterval) {
    clearInterval(deploymentPollInterval)
  }
})

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}
