require('dotenv').config();
const express = require('express');
const path = require('path');
const { Resend } = require('resend');
const vehicleLabels = require('./lib/vehicleLabels');
const { buildVehicleFeed } = require('./lib/googleVehicleFeed');
const { filterVehicles, pickFeaturedVehicles } = require('./lib/vehicleFilters');
const { createInventoryStore } = require('./lib/inventoryStore');
const { syncInventory, getInventory, getSyncStatus } = require('./lib/inventory');
const { isSyncAuthorized } = require('./lib/syncAuth');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = 'https://hf-autos.de';
const DEFAULT_CONTACT_EMAIL = process.env.RESEND_TO_EMAIL || 'hf.fahrzeuge@gmail.com';

const HTML_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400';
const STATIC_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';
const VERSIONED_STATIC_CACHE = 'public, max-age=31536000, immutable';
const SHORT_CDN_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400';
const NO_STORE = 'no-store';

// Initialize Resend (the SDK throws without a key, so the app stays usable locally without one)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Middleware
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Bump when styles.css or js/site.js change so browsers fetch the new files
const ASSET_VERSION = '20261029-whatsapp';

app.use((req, res, next) => {
    res.locals.assetVersion = ASSET_VERSION;
    res.locals.whatsappVehicleUrl = vehicleLabels.whatsappVehicleUrl;
    res.locals.staticAsset = (assetPath) => {
        const cdnBaseUrl = process.env.CDN_BASE_URL;

        if (!cdnBaseUrl || assetPath.startsWith('http')) {
            return assetPath;
        }

        return `${cdnBaseUrl.replace(/\/$/, '')}${assetPath.startsWith('/') ? assetPath : `/${assetPath}`}`;
    };

    next();
});

// Serve static files (images, videos, CSS, JS)
app.use(express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        const fileName = path.basename(filePath);
        const isVersionedAsset = /\.[a-z0-9]+(?=\.[a-z0-9]+$)/i.test(fileName) || filePath.includes(`${path.sep}optimized${path.sep}`);

        if (fileName === 'sitemap.xml' || fileName === 'robots.txt') {
            res.setHeader('Cache-Control', SHORT_CDN_CACHE);
            return;
        }

        res.setHeader('Cache-Control', isVersionedAsset ? VERSIONED_STATIC_CACHE : STATIC_CACHE);
    }
}));

const cacheHtml = (req, res, next) => {
    res.set('Cache-Control', HTML_CACHE);
    next();
};

function getSeoData(title, description, canonicalPath) {
    return {
        title,
        description,
        canonicalUrl: `${SITE_URL}${canonicalPath}`
    };
}

// Routes
app.get('/', cacheHtml, async (req, res, next) => {
    try {
        // A failing inventory read must never break the homepage; the slideshow is just hidden.
        const featured = pickFeaturedVehicles(await getListedVehicles().catch(() => []));
        res.render('index', {
            ...getSeoData(
                'HF Autos | H&F Autohaus Bodenheim - Gebrauchtwagen in der Naehe',
                'HF Autos / H&F Autohaus in Bodenheim bei Mainz. Ihr Autohaendler in der Naehe fuer Gebrauchtwagen An- und Verkauf. Barzahlung, Finanzierung. Jetzt Fahrzeug kaufen oder verkaufen!',
                '/'
            ),
            featured,
            helpers: vehicleLabels
        });
    } catch (error) { next(error); }
});

app.get('/ueber-uns', cacheHtml, (req, res) => {
    res.render('ueber-uns', getSeoData(
        'Über uns | H&F Autohaus Bodenheim – Gebrauchtwagen bei Mainz',
        'Seit über sechs Jahren steht das H&F Autohaus Bodenheim für faire Beratung, zuverlässigen Service und hochwertigen Gebrauchtwagenhandel in Mainz und Rheinhessen.',
        '/ueber-uns'
    ));
});

app.get('/kontakt', cacheHtml, (req, res) => {
    res.render('kontakt', getSeoData(
        'Kontakt | H&F Autohaus Bodenheim',
        'Kontakt zum H&F Autohaus Bodenheim: Am Kümmerling 41a, 55294 Bodenheim. Telefon 0176 62878366, WhatsApp und E-Mail. Mo–Fr 9–18 Uhr.',
        '/kontakt'
    ));
});

app.get('/impressum', cacheHtml, (req, res) => {
    res.render('impressum', getSeoData(
        'Impressum - H&F Autohaus Bodenheim',
        'Impressum von H&F Autohaus Bodenheim mit Kontakt- und Unternehmensdaten.',
        '/impressum'
    ));
});

app.get('/datenschutz', cacheHtml, (req, res) => {
    res.render('datenschutz', getSeoData(
        'Datenschutzerklaerung - H&F Autohaus Bodenheim',
        'Datenschutzerklaerung von H&F Autohaus Bodenheim zu Verarbeitung und Schutz personenbezogener Daten.',
        '/datenschutz'
    ));
});

// Legal route aliases
app.get('/datenshutz', (req, res) => res.redirect(301, '/datenschutz'));
app.get('/privacy', (req, res) => res.redirect(301, '/datenschutz'));
app.get('/privacy-policy', (req, res) => res.redirect(301, '/datenschutz'));
app.get('/imprint', (req, res) => res.redirect(301, '/impressum'));

// Sitemap route: static pages plus one entry per listed vehicle
app.get('/sitemap.xml', async (req, res, next) => {
    try {
        const vehicles = await getListedVehicles();
        res.set('Cache-Control', SHORT_CDN_CACHE);
        res.type('application/xml').render('sitemap', { vehicles, vehicleUrl: vehicleLabels.vehicleUrl });
    } catch (error) { next(error); }
});

app.get('/robots.txt', (req, res) => {
    res.set('Cache-Control', SHORT_CDN_CACHE);
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

// Blog routes
app.get('/blog', cacheHtml, (req, res) => {
    res.render('blog', {
        title: 'Blog - H&F Autohaus Bodenheim | Tipps & Ratgeber',
        description: 'Nuetzliche Tipps und Ratgeber rund um Autoankauf, Autoverkauf und Gebrauchtwagen. H&F Autohaus Bodenheim - Ihr Experte fuer Gebrauchtwagen in Mainz und Umgebung.'
    });
});

// Individual blog post routes
app.get('/blog/tipps-auto-schnell-verkaufen-bodenheim', cacheHtml, (req, res) => {
    res.render('blog-post', {
        title: 'Tipps, um ein Auto in Bodenheim schnell zu verkaufen | H&F Autohaus',
        description: 'Praktische Tipps und Strategien, um Ihr Auto in Bodenheim schnell und zu einem fairen Preis zu verkaufen. Erfahren Sie, wie Sie den besten Verkaufspreis erzielen.',
        post: {
            slug: 'tipps-auto-schnell-verkaufen-bodenheim',
            title: 'Tipps, um ein Auto in Bodenheim schnell zu verkaufen',
            date: '2024-01-15',
            image: 'https://images.unsplash.com/photo-1492144534655-ae79c2c03448?w=1200&h=600&fit=crop',
            excerpt: 'Moechten Sie Ihr Auto schnell verkaufen? Erfahren Sie, wie Sie in Bodenheim den besten Preis fuer Ihr Fahrzeug erzielen und den Verkaufsprozess beschleunigen.'
        }
    });
});

app.get('/blog/wie-funktioniert-autoankauf-mainz', cacheHtml, (req, res) => {
    res.render('blog-post', {
        title: 'Wie funktioniert Autoankauf in Mainz? | H&F Autohaus',
        description: 'Alles ueber den Autoankauf in Mainz: Ablauf, Bewertung, Preisgestaltung und was Sie beachten sollten. H&F Autohaus erklaert den professionellen Autoankauf-Prozess.',
        post: {
            slug: 'wie-funktioniert-autoankauf-mainz',
            title: 'Wie funktioniert Autoankauf in Mainz?',
            date: '2024-01-10',
            image: 'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=1200&h=600&fit=crop',
            excerpt: 'Erfahren Sie, wie der professionelle Autoankauf in Mainz funktioniert und welche Schritte fuer einen fairen und transparenten Verkaufsprozess wichtig sind.'
        }
    });
});

app.get('/blog/worauf-beim-gebrauchtwagen-achten', cacheHtml, (req, res) => {
    res.render('blog-post', {
        title: 'Worauf sollte man beim Gebrauchtwagen achten? | H&F Autohaus',
        description: 'Kaufratgeber: Worauf Sie beim Gebrauchtwagenkauf achten sollten. Checkliste fuer Technik, Papiere, Historie und mehr. H&F Autohaus Bodenheim gibt Tipps.',
        post: {
            slug: 'worauf-beim-gebrauchtwagen-achten',
            title: 'Worauf sollte man beim Gebrauchtwagen achten?',
            date: '2024-01-05',
            image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&h=600&fit=crop',
            excerpt: 'Der Kauf eines Gebrauchtwagens erfordert Sorgfalt. Diese Checkliste hilft Ihnen, die richtige Entscheidung zu treffen und boese Ueberraschungen zu vermeiden.'
        }
    });
});

// mobile.de inventory
const inventoryStore = createInventoryStore();

app.get('/bestand', async (req, res, next) => {
    try {
        const inventory = await getInventory({ store: inventoryStore });
        // Demonstration vehicles must never be advertised as actual stock.
        const available = inventory.source === 'mobile.de';
        const result = filterVehicles(available ? inventory.vehicles.filter(v => !v.isSample) : [], req.query);
        res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        res.render('bestand', {
            ...getSeoData('Fahrzeugbestand | H&F Autohaus Bodenheim', 'Entdecken Sie unsere Gebrauchtwagen in Bodenheim. Nach Marke, Preis, Erstzulassung, Kilometerstand, Kraftstoff und Getriebe filtern.', '/bestand'),
            ...result, available, lastSync: inventory.lastSync
        });
    } catch (error) { next(error); }
});

async function getListedVehicles() {
    const inventory = await getInventory({ store: inventoryStore });
    return inventory.source === 'mobile.de' ? inventory.vehicles.filter(v => !v.isSample) : [];
}

// Google Merchant Center vehicle ads feed (fetched by Merchant Center on a schedule).
app.get('/feeds/google-vehicles.tsv', async (req, res, next) => {
    try {
        const feed = buildVehicleFeed(await getListedVehicles(), { storeCode: process.env.GOOGLE_STORE_CODE });
        res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        res.type('text/tab-separated-values; charset=utf-8').send(feed);
    } catch (error) { next(error); }
});

// Vehicle detail page (landing page for Google vehicle ads).
app.get('/bestand/:slug', async (req, res, next) => {
    try {
        const vehicles = await getListedVehicles();
        const id = req.params.slug.split('-').pop();
        const vehicle = vehicles.find(v => v.slug === req.params.slug) || vehicles.find(v => v.id === id);

        if (!vehicle) {
            res.set('Cache-Control', 'public, s-maxage=60');
            return res.status(404).render('vehicle', {
                ...getSeoData('Fahrzeug nicht mehr verfügbar | H&F Autohaus Bodenheim', 'Dieses Fahrzeug ist nicht mehr verfügbar. Entdecken Sie unseren aktuellen Fahrzeugbestand.', '/bestand'),
                vehicle: null, related: vehicles.slice(0, 3), helpers: vehicleLabels
            });
        }
        if (vehicle.slug !== req.params.slug) {
            return res.redirect(301, `/bestand/${vehicle.slug}`);
        }

        const facts = [
            vehicle.firstRegistration && `EZ ${vehicleLabels.fmtMonth(vehicle.firstRegistration)}`,
            vehicle.mileage != null && `${vehicleLabels.fmtNumber(vehicle.mileage)} km`,
            vehicle.fuel, vehicle.gearbox, vehicle.power && `${vehicle.power.ps} PS`
        ].filter(Boolean).join(', ');
        res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        res.render('vehicle', {
            ...getSeoData(
                `${vehicle.title} – ${vehicleLabels.priceText(vehicle)} | H&F Autohaus Bodenheim`,
                `${vehicle.title}: ${facts}. ${vehicleLabels.priceText(vehicle)}. Jetzt bei H&F Autohaus in Bodenheim bei Mainz ansehen und Probefahrt vereinbaren.`,
                `/bestand/${vehicle.slug}`
            ),
            vehicle,
            related: vehicles.filter(v => v.id !== vehicle.id).slice(0, 3),
            helpers: vehicleLabels
        });
    } catch (error) { next(error); }
});

app.get('/api/vehicles', async (req, res) => {
    const inventory = await getInventory({ store: inventoryStore });
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.json({ count: inventory.vehicles.length, ...inventory });
});

async function runSync(res) {
    const result = await syncInventory({ store: inventoryStore });
    res.status(result.ok ? 200 : 502).json(result);
}

app.all('/api/sync-vehicles', async (req, res) => {
    res.set('Cache-Control', NO_STORE);

    if (req.method !== 'GET' && req.method !== 'POST') {
        res.set('Allow', 'GET, POST');
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    if (!isSyncAuthorized(req.headers)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    try {
        if (req.method === 'POST' || req.query.sync === '1') {
            return await runSync(res);
        }
        res.json(await getSyncStatus({ store: inventoryStore }));
    } catch (error) {
        console.error('Inventory sync route failed:', error);
        res.status(500).json({ ok: false, error: 'Sync failed' });
    }
});

// Contact form submission route
app.post('/contact', async (req, res) => {
    res.set('Cache-Control', NO_STORE);

    try {
        const { name, email, phone, message, privacyConsent, website } = req.body;
        const hasPrivacyConsent = privacyConsent === true
            || privacyConsent === 'true'
            || privacyConsent === 'on'
            || privacyConsent === 1
            || privacyConsent === '1';

        if (website) {
            return res.status(400).json({
                success: false,
                message: 'Ihre Anfrage konnte nicht gesendet werden.'
            });
        }

        // Validate required fields
        if (!name || !email || !message || !hasPrivacyConsent) {
            return res.status(400).json({
                success: false,
                message: 'Bitte fuellen Sie alle Pflichtfelder aus und bestaetigen Sie die Datenschutzerklaerung.'
            });
        }

        if (!resend) {
            console.error('Contact form submitted but RESEND_API_KEY is not set');
            return res.status(503).json({
                success: false,
                message: 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es spaeter erneut.'
            });
        }

        // Send email using Resend
        const emailResult = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: DEFAULT_CONTACT_EMAIL,
            replyTo: email,
            subject: `Neue Kontaktanfrage von ${name} - H&F Autohaus`,
            html: `
                <h2>Neue Kontaktanfrage</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>E-Mail:</strong> ${email}</p>
                <p><strong>Telefon:</strong> ${phone || 'Nicht angegeben'}</p>
                <p><strong>Nachricht:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <p><strong>Datenschutz-Einwilligung:</strong> Erteilt</p>
                <hr>
                <p><small>Diese E-Mail wurde ueber das Kontaktformular auf der H&F Autohaus Website gesendet.</small></p>
            `
        });

        if (emailResult.error) {
            console.error('Resend error:', emailResult.error);
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es spaeter erneut.'
            });
        }

        // Send confirmation email to customer
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: email,
            subject: 'Ihre Anfrage bei H&F Autohaus Bodenheim',
            html: `
                <h2>Vielen Dank fuer Ihre Anfrage!</h2>
                <p>Sehr geehrte/r ${name},</p>
                <p>wir haben Ihre Nachricht erhalten und werden uns schnellstmoeglich bei Ihnen melden.</p>
                <p><strong>Ihre Nachricht:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p>Mit freundlichen Gruessen,<br>H&F Autohaus Bodenheim</p>
                <p><small>Am Kuemmerling 41a, 55294 Bodenheim<br>Tel: 017662878366<br>E-Mail: hf.fahrzeuge@gmail.com</small></p>
            `
        });

        res.json({
            success: true,
            message: 'Vielen Dank fuer Ihre Anfrage! Wir werden uns schnellstmoeglich bei Ihnen melden.'
        });
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({
            success: false,
            message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es spaeter erneut.'
        });
    }
});

// Export for Vercel
module.exports = app;

// Start server (only in development)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`H&F Autohaus Website is running on http://localhost:${PORT}`);
        console.log('Contact: hf.fahrzeuge@gmail.com');
        console.log('Phone: 017662878366');
        console.log(`Email service: ${process.env.RESEND_API_KEY ? 'Configured' : 'Not configured'}`);
    });
}
