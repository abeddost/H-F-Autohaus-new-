# H&F Autohaus Bodenheim Website

Eine moderne, responsive Website für H&F Autohaus Bodenheim - Ihr Partner für Gebrauchtwagen.

## Features

- **Dark Theme Design**: Elegantes dunkles Design mit goldenen Akzenten
- **Video Hero Section**: Autoplay Hero-Video für einen professionellen ersten Eindruck
- **Responsive Layout**: Optimiert für Desktop, Tablet und Mobile
- **Sections**:
  - Hero mit Video-Hintergrund
  - Leistungen (Services)
  - Garantie/Versicherung
  - Fahrzeugankauf mit Kontaktformular
  - Kontakt mit Google Maps Integration
- **WhatsApp Integration**: Direkte Kontaktaufnahme über WhatsApp
- **Smooth Scrolling**: Sanfte Navigation zwischen Sektionen
- **Contact Forms**: Kontaktformular für Anfragen

## Technologie

- HTML5
- Tailwind CSS (via CDN)
- Vanilla JavaScript
- Google Maps Embed API

## Struktur

```
/
├── index.html          # Hauptseite
├── logo.png           # Firmenlogo
├── images/            # Bilder für Hintergründe
│   ├── bmw.jpg
│   ├── porche.jpg
│   ├── m3.png
│   └── r8.png
└── Videos/            # Video-Assets
    └── hero.mp4       # Hero-Section Video
```

## Anpassungen

### Farben ändern
Die Farbpalette kann im Tailwind-Config-Block im `<head>` angepasst werden:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#1a1a1a',      // Haupthintergrund
                secondary: '#2d2d2d',    // Sekundärer Hintergrund
                accent: '#d4af37',       // Akzentfarbe (Gold)
                'accent-hover': '#b8941f' // Hover-Zustand
            }
        }
    }
}
```

### Kontaktinformationen
Alle Kontaktdaten befinden sich im HTML und können direkt bearbeitet werden:
- Telefon: `017662878366`
- E-Mail: `hf.fahrzeuge@gmail.com`
- Adresse: `Am Kuemmerling 41a, 55294 Bodenheim`

### Google Maps
Die Karte ist bereits für die angegebene Adresse konfiguriert. Bei Bedarf kann die Embed-URL angepasst werden.

## Browser-Kompatibilität

- Chrome (empfohlen)
- Firefox
- Safari
- Edge
- Mobile Browser (iOS Safari, Chrome Mobile)

## Deployment

Die Website ist eine statische HTML-Seite und kann auf jedem Webserver gehostet werden:
- Upload aller Dateien via FTP
- Oder nutzen Sie Dienste wie Netlify, Vercel, oder GitHub Pages

## Support

Bei Fragen oder Anpassungswünschen wenden Sie sich an Ihren Entwickler.

---

© 2024 H&F Autohaus Bodenheim. Alle Rechte vorbehalten.


