const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, shell } = require('electron')
const path = require('path')
const Store = require('electron-store')

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
  })

  // Load CRM
  mainWindow.loadURL(CRM_URL)

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

  // Start deployment polling
  startDeploymentPolling()
}

// Create deployment overlay window
function createDeploymentWindow() {
  if (deploymentWindow) return

  deploymentWindow = new BrowserWindow({
    width: 320,
    height: 120,
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

  if (!deploymentWindow) {
    createDeploymentWindow()
  }

  deploymentWindow.webContents.once('did-finish-load', () => {
    deploymentWindow.webContents.send('deployment-update', deployments)
    deploymentWindow.show()
  })

  if (deploymentWindow.isVisible()) {
    deploymentWindow.webContents.send('deployment-update', deployments)
  }
}

// Hide deployment overlay
function hideDeploymentOverlay() {
  if (deploymentWindow) {
    deploymentWindow.hide()
  }
}

// Poll for deployments
async function pollDeployments() {
  try {
    const response = await fetch(`${CRM_URL}/api/deployments/status`)
    if (!response.ok) return

    const data = await response.json()
    const deployments = data.deployments || []

    // Check for new deployments to notify
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
          current.status === 'done' ? 'Deployment Successful' : 'Deployment Failed',
          `${current.appName} - ${current.projectName}`,
          current.status === 'done' ? 'success' : 'error'
        )
      }
    }

    activeDeployments = deployments
  } catch (error) {
    console.error('Failed to poll deployments:', error)
  }
}

// Start deployment polling
function startDeploymentPolling() {
  pollDeployments()
  deploymentPollInterval = setInterval(pollDeployments, 5000) // Every 5 seconds
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

// App lifecycle
app.whenReady().then(() => {
  createMainWindow()
  createTray()

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
