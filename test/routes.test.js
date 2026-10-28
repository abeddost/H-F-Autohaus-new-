const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const fixture = require('./fixtures/ad.json');

// Env must be set before server.js loads (dotenv never overrides existing vars).
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-routes-'));
Object.assign(process.env, {
    INVENTORY_FILE: path.join(dir, 'inventory.json'),
    SYNC_SECRET: 'test-sync-secret-123456',
    CRON_SECRET: 'test-cron-secret-123456',
    MOBILE_DE_API: 'seller',
    MOBILE_DE_USERNAME: 'api-user',
    MOBILE_DE_PASSWORD: 'secret',
    MOBILE_DE_SELLER_ID: '26132851',
    RESEND_API_KEY: process.env.RESEND_API_KEY || 're_test_key'
});
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.KV_REST_API_URL;

// Stub mobile.de; let local requests through.
const realFetch = globalThis.fetch;
let mobileDeStatus = 200;
globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://services.mobile.de/')) {
        if (mobileDeStatus !== 200) {
            return new Response('', { status: mobileDeStatus });
        }
        return new Response(JSON.stringify({ ads: [fixture] }), { status: 200 });
    }
    return realFetch(url, options);
};

const app = require('../server');
let server;
let base;

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

const auth = (secret) => ({ headers: { Authorization: `Bearer ${secret}` } });

test('GET /api/vehicles serves samples before the first sync', async () => {
    const response = await fetch(`${base}/api/vehicles`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.source, 'sample');
});

test('Bestand shows an honest unavailable state before the first import', async () => {
    const response = await fetch(`${base}/bestand`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /kann hier gerade nicht geladen werden/);
    assert.doesNotMatch(html, /<article class="stock-card">/);
});

test('sync endpoints reject unauthenticated requests', async () => {
    assert.equal((await fetch(`${base}/api/sync-vehicles`)).status, 401);
    assert.equal((await fetch(`${base}/api/sync-vehicles?sync=1`)).status, 401);
    assert.equal((await fetch(`${base}/api/sync-vehicles`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${base}/api/sync-vehicles`, { method: 'POST', ...auth('wrong') })).status, 401);
});

test('GET without sync=1 returns status only', async () => {
    const response = await fetch(`${base}/api/sync-vehicles`, auth('test-sync-secret-123456'));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.lastSync, null);
    assert.equal(body.vehicleCount, 0);
});

test('cron GET ?sync=1 with CRON_SECRET syncs, then /api/vehicles serves real inventory', async () => {
    const response = await fetch(`${base}/api/sync-vehicles?sync=1`, auth('test-cron-secret-123456'));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.stats.added, 1);

    const vehicles = await (await fetch(`${base}/api/vehicles`)).json();
    assert.equal(vehicles.source, 'mobile.de');
    assert.equal(vehicles.count, 1);
    assert.equal(vehicles.vehicles[0].id, '412345678');
    assert.equal(JSON.stringify(vehicles).includes('secret'), false, 'credentials never leak');
});

test('POST sync failure returns 502 and keeps inventory', async () => {
    mobileDeStatus = 503;
    const response = await fetch(`${base}/api/sync-vehicles`, { method: 'POST', ...auth('test-sync-secret-123456') });
    assert.equal(response.status, 502);
    mobileDeStatus = 200;

    const vehicles = await (await fetch(`${base}/api/vehicles`)).json();
    assert.equal(vehicles.count, 1);
});

test('Bestand renders imported stock and filters it without exposing credentials', async () => {
    const response = await fetch(`${base}/bestand`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Mercedes-Benz C 220/);
    assert.match(html, /name="maxPrice"/);
    assert.equal(html.includes(process.env.MOBILE_DE_PASSWORD), false);
    const filtered = await (await fetch(`${base}/bestand?maxPrice=1000`)).text();
    assert.match(filtered, /Für diese Filter/);
    assert.doesNotMatch(filtered, /<article class="stock-card">/);
});

test('every vehicle has its own detail page with price, identifier and structured data', async () => {
    const slug = 'mercedes-benz-c-220-412345678';
    const listing = await (await fetch(`${base}/bestand`)).text();
    assert.match(listing, new RegExp(`href="/bestand/${slug}"`), 'cards link to the detail page');

    const response = await fetch(`${base}/bestand/${slug}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /<h1[^>]*>Mercedes-Benz C 220 d T-Modell AMG Line<\/h1>/);
    assert.match(html, /28\.990 €/);
    assert.match(html, /Fahrzeug-Nr\. <span[^>]*>412345678<\/span>/);
    assert.match(html, /64\.500 km/);
    assert.match(html, /<link rel="canonical" href="https:\/\/hf-autos\.de\/bestand\/mercedes-benz-c-220-412345678">/);

    const jsonLd = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)[1]);
    assert.equal(jsonLd['@type'], 'Car');
    assert.equal(jsonLd.offers.price, 28990);
    assert.equal(jsonLd.offers.priceCurrency, 'EUR');
    assert.equal(jsonLd.mileageFromOdometer.value, 64500);
    assert.equal(html.includes(process.env.MOBILE_DE_PASSWORD), false);
});

test('outdated slugs redirect, sold vehicles return 404, sitemap lists vehicles', async () => {
    const redirect = await fetch(`${base}/bestand/alter-name-412345678`, { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/bestand/mercedes-benz-c-220-412345678');

    const gone = await fetch(`${base}/bestand/verkauft-999`);
    assert.equal(gone.status, 404);
    assert.match(await gone.text(), /nicht mehr verfügbar/);

    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    assert.match(sitemap, /<loc>https:\/\/hf-autos\.de\/bestand\/mercedes-benz-c-220-412345678<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/hf-autos\.de\/<\/loc>/);
});

test('Über uns and Kontakt are separate pages; Ankauf is gone from the menu', async () => {
    const about = await fetch(`${base}/ueber-uns`);
    const aboutHtml = await about.text();
    assert.equal(about.status, 200);
    assert.match(aboutHtml, /<h1[^>]*>[\s\S]*Fahrzeughandel, wie er sein sollte/);

    const contact = await fetch(`${base}/kontakt`);
    const contactHtml = await contact.text();
    assert.equal(contact.status, 200);
    assert.match(contactHtml, /id="contactForm"/);
    assert.match(contactHtml, /id="customModal"/);
    assert.match(contactHtml, /google\.com\/maps\/embed/);

    const home = await (await fetch(`${base}/`)).text();
    assert.doesNotMatch(home, /id="fahrzeugankauf"|id="ueber-uns"|id="kontakt"|id="contactForm"/);
    assert.match(home, /href="\/ueber-uns"/);
    assert.match(home, /href="\/kontakt"/);
    assert.doesNotMatch(home, />Ankauf</);
    assert.match(home, /<link rel="icon" href="\/favicon\.ico"/);
});

test('Google vehicle feed is served as TSV from the synced inventory', async () => {
    const response = await fetch(`${base}/feeds/google-vehicles.tsv`);
    const tsv = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/tab-separated-values/);
    const [header, row] = tsv.trim().split('\n');
    assert.match(header, /^id\ttitle\tdescription\tlink\t/);
    assert.match(row, /^412345678\t/);
    assert.match(row, /\t28990\.00 EUR\t/);
});

test('homepage shows the Top-Fahrzeuge slideshow above Leistungen once stock is imported', async () => {
    const home = await (await fetch(`${base}/`)).text();
    const slideshow = home.indexOf('id="top-fahrzeuge"');
    assert.ok(slideshow > -1, 'slideshow rendered');
    assert.ok(slideshow < home.indexOf('id="leistungen"'), 'placed above Leistungen');
    assert.match(home, /class="feat-slide"[\s\S]*?href="\/bestand\/mercedes-benz-c-220-412345678"/);
    assert.match(home, /28\.990 €/);
});

test('WhatsApp leads are marked as coming from the website', async () => {
    const contact = await (await fetch(`${base}/kontakt`)).text();
    assert.match(contact, /id="whatsappSendBtn"/);

    const vehiclePage = await (await fetch(`${base}/bestand/mercedes-benz-c-220-412345678`)).text();
    const href = /href="(https:\/\/wa\.me\/4917662878366\?text=[^"]+)"/.exec(vehiclePage)[1];
    const text = decodeURIComponent(new URL(href.replace(/&amp;/g, '&')).searchParams.get('text'));
    assert.match(text, /Fahrzeuganfrage über hf-autos\.de/);
    assert.match(text, /Fahrzeug-Nr\.:\* 412345678/);
    assert.match(text, /https:\/\/hf-autos\.de\/bestand\/mercedes-benz-c-220-412345678/);
});
