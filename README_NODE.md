# H&F Autohaus Website - Node.js Version

Eine moderne Node.js/Express Website für H&F Autohaus Bodenheim.

## 🚀 Installation

1. **Node.js installieren** (falls noch nicht vorhanden)
   - Download von [nodejs.org](https://nodejs.org/)
   - Empfohlene Version: Node.js 18.x oder höher

2. **Dependencies installieren**
   ```bash
   npm install
   ```

## 📦 Projektstruktur

```
/
├── server.js          # Express Server
├── package.json       # Dependencies & Scripts
├── views/             # EJS Templates
│   └── index.ejs     # Hauptseite
├── public/            # Statische Dateien
│   ├── logo.png      # Logo
│   ├── images/       # Bilder
│   └── Videos/       # Videos
└── README_NODE.md    # Diese Datei
```

## 🏃 Server starten

### Development Mode (mit Auto-Reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Der Server läuft standardmäßig auf: **http://localhost:3000**

## 📝 Wichtige Hinweise

### Assets verschieben
Falls die Assets noch nicht im `public/` Ordner sind, bitte manuell verschieben:

```bash
# Logo
cp logo.png public/

# Bilder
cp -r images/* public/images/

# Videos
cp -r Videos/* public/Videos/
```

### Port ändern
Der Port kann über die Umgebungsvariable `PORT` geändert werden:

```bash
PORT=8080 npm start
```

## 🛠️ Technologie Stack

- **Node.js** - JavaScript Runtime
- **Express.js** - Web Framework
- **EJS** - Template Engine
- **Tailwind CSS** - Styling (via CDN)

## 📧 Kontakt

- **E-Mail**: hfautohaus@gmail.com
- **Telefon**: 017662878366
- **Adresse**: Am Kuemmerling 41a, 55294 Bodenheim

## 📄 Lizenz

© 2024 H&F Autohaus Bodenheim. Alle Rechte vorbehalten.

