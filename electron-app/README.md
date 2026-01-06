# CRM Luelis - Application Desktop

Application Electron pour le CRM Luelis avec :
- Notifications système natives
- Overlay de déploiement en temps réel
- Icône dans la barre des tâches
- Installeur stylé (Windows/Mac/Linux)

## Installation

```bash
npm install
```

## Générer les icônes

```bash
node scripts/generate-icons.js
```

Ensuite, convertir manuellement :
- `build/icon.ico.png` → `build/icon.ico` (utiliser [ConvertICO](https://convertico.com/))
- `build/installerSidebar.png` → `build/installerSidebar.bmp`

## Développement

```bash
npm start
```

## Build

### Windows
```bash
npm run build:win
```

### macOS
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

### Tous
```bash
npm run build
```

## Structure

```
electron-app/
├── build/                  # Assets pour le build
│   ├── icon.png           # Icône principale (512x512)
│   ├── icon.ico           # Icône Windows
│   ├── icon.icns          # Icône macOS (généré auto)
│   ├── tray-icon.png      # Icône tray
│   ├── notification-*.png # Icônes notifications
│   └── installerSidebar.bmp # Sidebar installeur NSIS
├── src/
│   ├── main.js            # Process principal Electron
│   ├── preload.js         # Script preload (IPC sécurisé)
│   └── deployment-overlay.html # Widget de déploiement
├── scripts/
│   └── generate-icons.js  # Script génération icônes
└── dist/                   # Output des builds
```

## Fonctionnalités

### Notifications Système
L'app envoie des notifications natives quand :
- Un déploiement se termine (succès ou erreur)
- Une nouvelle notification CRM arrive

### Overlay de Déploiement
Un petit widget transparent apparaît en haut à gauche de l'écran quand un déploiement est en cours, et disparaît automatiquement quand c'est terminé.

### Tray Icon
- Clic gauche : Afficher/Masquer la fenêtre
- Clic droit : Menu avec options
  - Notifications on/off
  - Overlay deployments on/off
  - Minimiser dans le tray on/off
  - Quitter

## Personnalisation

### Changer l'URL du CRM
Modifier dans `src/main.js` :
```javascript
const store = new Store({
  defaults: {
    crmUrl: 'https://votre-crm.example.com',
    ...
  }
})
```

### Changer les couleurs des icônes
Modifier les SVG dans `scripts/generate-icons.js` et régénérer.
