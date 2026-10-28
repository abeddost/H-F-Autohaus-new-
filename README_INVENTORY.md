# mobile.de Inventory Sync

Pulls all active ads from the mobile.de Search API (or Seller API), stores them, and serves them at `GET /api/vehicles`. Credentials stay server-side.

## Setup

1. **API access.** Dealer Inserats-Einbindung credentials work with `MOBILE_DE_API=search`. Seller API credentials use `MOBILE_DE_API=seller`. Credentials stay in the ignored `.env` locally and host environment variables in production.
2. **Storage.** In Vercel, add an Upstash Redis database from the Marketplace (Storage tab). That sets `UPSTASH_REDIS_REST_URL`/`_TOKEN` or `KV_REST_API_URL`/`_TOKEN`. Both naming styles work. Locally, data is written to `data/inventory.json`, which is git-ignored.
3. **Environment variables.** See `.env.example`. In Vercel set `MOBILE_DE_API=search`, `MOBILE_DE_USERNAME`, `MOBILE_DE_PASSWORD`, `MOBILE_DE_SELLER_ID`, `SYNC_SECRET` and `CRON_SECRET`. Both secrets must be at least 16 characters (`openssl rand -hex 32`).
4. **Cron.** `vercel.json` calls `GET /api/sync-vehicles?sync=1` daily at 03:00 UTC. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

## Endpoints

| Request | Auth | Result |
| --- | --- | --- |
| `GET /api/vehicles` | none | `{ count, source: "mobile.de" \| "sample", lastSync, vehicles }` |
| `GET /api/sync-vehicles` | secret | Sync status only (last sync, count, last error) |
| `GET /api/sync-vehicles?sync=1` | secret | Runs a sync (used by the cron) |
| `POST /api/sync-vehicles` | secret | Runs a sync |

Pass the secret as `Authorization: Bearer <SYNC_SECRET or CRON_SECRET>` or `x-sync-secret: <secret>`.

```bash
curl -X POST -H "Authorization: Bearer $SYNC_SECRET" https://hf-autos.de/api/sync-vehicles
```

## Behaviour

- Each successful sync replaces the inventory. Sold or removed ads drop out, and the response reports `added/updated/unchanged/removed`.
- A failed sync (API error, timeout, bad payload) keeps the stored inventory and records `lastError` in the status. The endpoint answers `502`.
- Sample vehicles (`isSample: true`) are served only until the first successful sync. After that, an empty result is treated as real (everything sold).

## Code

- `lib/mobileDe.js`: API client and mapping from an ad to a `Vehicle`.
- `lib/inventoryStore.js`: Redis/KV or local JSON storage.
- `lib/inventory.js`: sync, read and status logic.
- `lib/syncAuth.js`: secret check (fails closed).
- `test/`: run with `npm test`.

The field mapping follows the documented Seller-API schema. Once the API credentials work, run one sync and spot-check `/api/vehicles` against a live ad. Fields mobile.de doesn't send come back as `null`.

## Bestand page

`/bestand` uses the existing site's navigation, footer and black/champagne design. It only advertises imported vehicles, never sample inventory. Filters combine search, make, fuel, gearbox, maximum price, registration year and mileage; sorting supports price, mileage, registration and latest modification. GET forms work without JavaScript and preserve shareable filter URLs. Cards open the full mobile.de listing and provide a vehicle-specific WhatsApp inquiry.

Connection verified on 2026-10-28 with the replacement API credentials: Search API returned 22 listings, all with prices and images; successfully imported into local inventory. Seller API access is unavailable for this account, so use `MOBILE_DE_API=search`. Search imports use the documented `customerId` filter, load every page, and reject search warnings, seller mismatches, duplicates and incomplete results to preserve the previous inventory.

The new page is a local implementation; production still requires deploying the changed source, setting the credentials/secrets in the host environment and configuring durable inventory storage as described above.

## Vehicle pages and Google vehicle ads

- Every listed car has a detail page at `/bestand/<slug>` (e.g. `/bestand/opel-zafira-50858780164096`). It is the landing page for Google vehicle ads. Price, mileage, VIN and vehicle number (`id`) are visible above the fold, and the page includes schema.org `Car` structured data. Outdated slugs redirect (301). Sold cars return 404. All vehicle pages are listed in `/sitemap.xml`.
- `GET /feeds/google-vehicles.tsv` is a Merchant Center primary feed generated from the same inventory, so feed and landing page always match. Columns follow Google's vehicle ads spec for Germany: id, link, image_link, price, condition, brand, model, year, mileage, vin, color, google_product_category 916, and others.
- Merchant Center setup: add a data source of type file, then "Scheduled fetch" with the URL `https://hf-autos.de/feeds/google-vehicles.tsv` (daily, after the 03:00 UTC sync). Set `GOOGLE_STORE_CODE` to the store code from your Google Business Profile so vehicles are offered as `in_store`. Without it, Merchant Center reports missing fulfillment.
- Cars without a price ("Preis auf Anfrage") or without photos are left out of the feed. Cars without a VIN on mobile.de are included without one; Merchant Center may flag them.
