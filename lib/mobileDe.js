// mobile.de Search / Seller API client + mapping into the site's Vehicle shape.
// Docs: https://services.mobile.de/manual/seller-api.html
// Credentials stay server-side (env only) and are never sent to the browser.

const DEFAULT_BASE_URL = 'https://services.mobile.de';
const ACCEPT_JSON = 'application/vnd.de.mobile.api+json';
const REQUEST_TIMEOUT_MS = 20000;
const IMAGE_FETCH_CONCURRENCY = 4;

const SELLER_CONTACT = {
    name: 'H&F Autohaus Bodenheim',
    phone: '+49 176 62878366',
    email: 'hf.fahrzeuge@gmail.com',
    address: 'Am Kuemmerling 41a, 55294 Bodenheim'
};

const FUEL_LABELS = {
    PETROL: 'Benzin',
    DIESEL: 'Diesel',
    ELECTRICITY: 'Elektro',
    HYBRID: 'Hybrid (Benzin/Elektro)',
    HYBRID_DIESEL: 'Hybrid (Diesel/Elektro)',
    LPG: 'Autogas (LPG)',
    CNG: 'Erdgas (CNG)',
    HYDROGENIUM: 'Wasserstoff',
    ETHANOL: 'Ethanol',
    OTHER: 'Andere'
};

const GEARBOX_LABELS = {
    MANUAL_GEAR: 'Schaltgetriebe',
    AUTOMATIC_GEAR: 'Automatik',
    SEMIAUTOMATIC_GEAR: 'Halbautomatik'
};

// Boolean ad flags that are worth showing as equipment.
const FEATURE_LABELS = {
    abs: 'ABS',
    esp: 'ESP',
    alloyWheels: 'Leichtmetallfelgen',
    centralLocking: 'Zentralverriegelung',
    electricWindows: 'Elektr. Fensterheber',
    electricHeatedSeats: 'Sitzheizung',
    electricAdjustableSeats: 'Elektr. Sitzeinstellung',
    electricExteriorMirrors: 'Elektr. Seitenspiegel',
    navigationSystem: 'Navigationssystem',
    immobilizer: 'Wegfahrsperre',
    powerAssistedSteering: 'Servolenkung',
    cruiseControl: 'Tempomat',
    sunroof: 'Schiebedach',
    panoramicGlassRoof: 'Panorama-Dach',
    headUpDisplay: 'Head-Up Display',
    bluetooth: 'Bluetooth',
    handsFreePhoneSystem: 'Freisprecheinrichtung',
    rainSensor: 'Regensensor',
    lightSensor: 'Lichtsensor',
    trailerCoupling: 'Anhängerkupplung',
    fullServiceHistory: 'Scheckheftgepflegt',
    nonSmokerVehicle: 'Nichtraucherfahrzeug',
    fourWheelDrive: 'Allradantrieb',
    xenonHeadlights: 'Xenonscheinwerfer',
    ledHeadlights: 'LED-Scheinwerfer',
    metallic: 'Metallic',
    automaticRainSensor: 'Regensensor',
    carplay: 'Apple CarPlay',
    androidAuto: 'Android Auto',
    keylessEntry: 'Keyless Entry',
    heatedSteeringWheel: 'Lenkradheizung',
    multifunctionalWheel: 'Multifunktionslenkrad',
    leatherSteeringWheel: 'Lederlenkrad',
    startStopSystem: 'Start-Stopp-Automatik',
    isofix: 'Isofix',
    laneDepartureWarning: 'Spurhalteassistent',
    blindSpotMonitor: 'Totwinkel-Assistent',
    trafficSignRecognition: 'Verkehrszeichenerkennung',
    collisionAvoidance: 'Notbremsassistent',
    distanceWarningSystem: 'Abstandswarner',
    highBeamAssist: 'Fernlichtassistent',
    hillStartAssist: 'Berganfahrassistent',
    tirePressureMonitoring: 'Reifendruckkontrolle',
    digitalCockpit: 'Digitales Cockpit',
    touchscreen: 'Touchscreen',
    voiceControl: 'Sprachsteuerung',
    wirelessCharging: 'Induktives Laden',
    soundSystem: 'Soundsystem',
    ambientLighting: 'Ambientebeleuchtung',
    electricTailgate: 'Elektr. Heckklappe',
    sportSeats: 'Sportsitze',
    sportPackage: 'Sportpaket',
    airSuspension: 'Luftfederung',
    roofRails: 'Dachreling',
    frontFogLights: 'Nebelscheinwerfer',
    heatedWindshield: 'Beheizbare Frontscheibe',
    winterPackage: 'Winterpaket',
    winterTires: 'Winterreifen',
    allSeasonTires: 'Ganzjahresreifen',
    auxiliaryHeating: 'Standheizung',
    emergencyCallSystem: 'Notrufsystem',
    newHuAu: 'HU/AU neu',
    warranty: 'Garantie'
};

const ENUM_FEATURE_LABELS = {
    speedControl: { CRUISE_CONTROL: 'Tempomat', ADAPTIVE_CRUISE_CONTROL: 'Abstandstempomat (ACC)' },
    headlightType: {
        LED_HEADLIGHTS: 'LED-Scheinwerfer',
        XENON_HEADLIGHTS: 'Xenon-Scheinwerfer',
        BI_XENON_HEADLIGHTS: 'Bi-Xenon-Scheinwerfer',
        LASER_HEADLIGHTS: 'Laserlicht'
    },
    trailerCouplingType: {
        TRAILER_COUPLING_FIX: 'Anhängerkupplung (starr)',
        TRAILER_COUPLING_DETACHABLE: 'Anhängerkupplung (abnehmbar)',
        TRAILER_COUPLING_SWIVELING: 'Anhängerkupplung (schwenkbar)'
    }
};

const CLIMATISATION_LABELS = {
    MANUAL_CLIMATISATION: 'Klimaanlage',
    AUTOMATIC_CLIMATISATION: 'Klimaautomatik',
    AUTOMATIC_CLIMATISATION_2_ZONES: '2-Zonen-Klimaautomatik',
    AUTOMATIC_CLIMATISATION_3_ZONES: '3-Zonen-Klimaautomatik',
    AUTOMATIC_CLIMATISATION_4_ZONES: '4-Zonen-Klimaautomatik'
};

const PARKING_ASSISTANT_LABELS = {
    FRONT_SENSORS: 'Einparkhilfe vorne',
    REAR_SENSORS: 'Einparkhilfe hinten',
    REAR_VIEW_CAM: 'Rückfahrkamera',
    CAM_360_DEGREES: '360°-Kamera',
    AUTOMATIC_PARKING: 'Selbstlenkende Systeme'
};

/**
 * @typedef {Object} Vehicle
 * @property {string} id                 mobile.de ad id
 * @property {string} slug
 * @property {string} make
 * @property {string} model
 * @property {string} title
 * @property {{ amount: number|null, currency: string, type: string, vatDeductible: boolean }} price
 * @property {string|null} vin
 * @property {string|null} condition  NEW | USED
 * @property {{ url: string, medium: string, thumb: string }[]} images
 * @property {number|null} mileage      km
 * @property {string|null} firstRegistration  YYYY-MM
 * @property {string|null} fuel
 * @property {string|null} gearbox
 * @property {{ kw: number, ps: number }|null} power
 * @property {string} description
 * @property {string[]} features
 * @property {Object<string, string|number|boolean>} specifications
 * @property {typeof SELLER_CONTACT} seller
 * @property {string} listingUrl
 * @property {string|null} updatedAt
 * @property {boolean} [isSample]
 */

function getConfig(env = process.env) {
    const username = env.MOBILE_DE_USERNAME;
    const password = env.MOBILE_DE_PASSWORD;
    const sellerId = env.MOBILE_DE_SELLER_ID;

    if (!username || !password || !sellerId) {
        throw new Error('mobile.de is not configured: set MOBILE_DE_USERNAME, MOBILE_DE_PASSWORD and MOBILE_DE_SELLER_ID');
    }

    return {
        username,
        password,
        sellerId,
        api: env.MOBILE_DE_API || 'seller',
        baseUrl: (env.MOBILE_DE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
    };
}

async function apiGet(config, path, fetchImpl = fetch) {
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
        headers: {
            Authorization: `Basic ${auth}`,
            Accept: ACCEPT_JSON
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
        const hint = response.status === 401
            ? ' (check that Seller-API access is activated and the API user credentials are correct)'
            : '';
        throw new Error(`mobile.de API ${path} responded ${response.status}${hint}`);
    }

    return response.json();
}

async function fetchAds(config, fetchImpl = fetch) {
    const data = await apiGet(config, `/seller-api/sellers/${encodeURIComponent(config.sellerId)}/ads`, fetchImpl);
    const ads = Array.isArray(data) ? data : data && data.ads;

    if (!Array.isArray(ads)) {
        throw new Error('mobile.de API returned an unexpected ads payload');
    }

    return ads;
}

async function fetchSearchAds(config, fetchImpl = fetch) {
    const ads = [];
    let expectedTotal;
    let maxPages = 1;
    for (let page = 1; page <= maxPages; page++) {
        const params = new URLSearchParams({ customerId: config.sellerId, 'page.size': '100', 'page.number': String(page) });
        const data = await apiGet(config, `/search-api/search?${params}`, fetchImpl);
        if (!Array.isArray(data.ads) || (data.errors && data.errors.length) ||
            !Number.isInteger(data.total) || data.total < 0 ||
            !Number.isInteger(data.maxPages) || data.maxPages < 0 || data.maxPages > 1000 ||
            (data.total > 0 && (data.currentPage !== page || data.maxPages < page))) {
            throw new Error('mobile.de Search API returned an invalid or incomplete result');
        }
        if (expectedTotal !== undefined && expectedTotal !== data.total) {
            throw new Error('mobile.de inventory changed during pagination; retry sync');
        }
        expectedTotal = data.total;
        maxPages = data.maxPages;
        for (const ad of data.ads) {
            if (!ad.mobileAdId || String(ad.mobileSellerId) !== String(config.sellerId)) {
                throw new Error('mobile.de returned a listing outside the configured seller inventory');
            }
            ads.push(ad);
        }
    }
    if (new Set(ads.map(ad => String(ad.mobileAdId))).size !== expectedTotal || ads.length !== expectedTotal) {
        throw new Error('mobile.de Search API returned incomplete or duplicate listings');
    }
    return ads;
}

// The search result only carries a summary (one image, no description, no VIN);
// the single-ad endpoint returns the full listing.
async function fetchSearchAdDetails(config, ads, fetchImpl = fetch) {
    return mapWithConcurrency(ads, IMAGE_FETCH_CONCURRENCY, async (ad) => {
        const detail = await apiGet(config, `/search-api/ad/${encodeURIComponent(ad.mobileAdId)}`, fetchImpl);
        if (!detail || String(detail.mobileAdId) !== String(ad.mobileAdId) ||
            String(detail.mobileSellerId) !== String(config.sellerId)) {
            throw new Error(`mobile.de returned unexpected details for ad ${ad.mobileAdId}`);
        }
        return { ...ad, ...detail };
    });
}

async function fetchAdImages(config, adId, fetchImpl = fetch) {
    const data = await apiGet(
        config,
        `/seller-api/sellers/${encodeURIComponent(config.sellerId)}/ads/${encodeURIComponent(adId)}/images`,
        fetchImpl
    );
    return Array.isArray(data) ? data : (data && data.images) || [];
}

async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;

    async function worker() {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index], index);
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

/**
 * Fetches every ad of the seller plus its images. Ads that already carry an
 * `images` array are used as-is; others are completed via the images endpoint.
 * Any failure rejects, so callers can keep their previous inventory.
 */
async function fetchInventory({ env = process.env, fetchImpl = fetch } = {}) {
    const config = getConfig(env);
    if (config.api === 'search') {
        const ads = await fetchSearchAds(config, fetchImpl);
        return (await fetchSearchAdDetails(config, ads, fetchImpl)).map(mapAdToVehicle);
    }
    const ads = await fetchAds(config, fetchImpl);

    const withImages = await mapWithConcurrency(ads, IMAGE_FETCH_CONCURRENCY, async (ad) => {
        if (Array.isArray(ad.images) && ad.images.length > 0) {
            return ad;
        }
        const images = await fetchAdImages(config, ad.mobileAdId, fetchImpl);
        return { ...ad, images };
    });

    return withImages.map(mapAdToVehicle);
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function formatMake(make) {
    if (!make) {
        return '';
    }
    if (make.length <= 3) {
        return make.toUpperCase();
    }
    return make
        .toLowerCase()
        .replace(/(^|[\s-])([a-zäöü])/g, (match, sep, letter) => sep + letter.toUpperCase());
}

function slugify(value) {
    return String(value)
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function toNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function formatYearMonth(value) {
    const match = /^(\d{4})(\d{2})$/.exec(String(value || ''));
    return match ? `${match[1]}-${match[2]}` : null;
}

function mapPrice(price = {}) {
    const type = price.type || 'FIXED';
    return {
        amount: type === 'ON_REQUEST' ? null : toNumber(price.consumerPriceGross),
        currency: price.currency || 'EUR',
        type,
        vatDeductible: toNumber(price.vatRate) > 0
    };
}

function mapFeatures(ad) {
    const features = [];

    // Some payloads carry an explicit list of feature codes or strings.
    if (Array.isArray(ad.features)) {
        ad.features.forEach((feature) => {
            if (typeof feature === 'string' && feature.trim()) {
                features.push(feature.trim());
            }
        });
    }

    Object.entries(FEATURE_LABELS).forEach(([key, label]) => {
        if (ad[key] === true) {
            features.push(label);
        }
    });

    Object.entries(ENUM_FEATURE_LABELS).forEach(([key, labels]) => {
        if (labels[ad[key]]) {
            features.push(labels[ad[key]]);
        }
    });

    if (ad.climatisation && CLIMATISATION_LABELS[ad.climatisation]) {
        features.push(CLIMATISATION_LABELS[ad.climatisation]);
    }

    if (Array.isArray(ad.parkingAssistants)) {
        ad.parkingAssistants.forEach((code) => {
            if (PARKING_ASSISTANT_LABELS[code]) {
                features.push(PARKING_ASSISTANT_LABELS[code]);
            }
        });
    }

    if (Array.isArray(ad.highlights)) {
        ad.highlights.forEach((highlight) => {
            if (typeof highlight === 'string' && highlight.trim()) {
                features.push(highlight.trim());
            }
        });
    }

    return [...new Set(features)];
}

function mapSpecifications(ad) {
    const specs = {
        category: ad.category,
        condition: ad.condition,
        exteriorColor: ad.exteriorColor,
        manufacturerColorName: ad.manufacturerColorName,
        interiorColor: ad.interiorColor,
        interiorType: ad.interiorType,
        doors: ad.doors,
        driveType: ad.driveType,
        seats: toNumber(ad.seats),
        cubicCapacity: toNumber(ad.cubicCapacity),
        emissionClass: ad.emissionClass,
        emissionSticker: ad.emissionSticker,
        co2Combined: ad.emissions && ad.emissions.combined ? toNumber(ad.emissions.combined.co2) : null,
        consumptionCombined: ad.consumptions && ad.consumptions.fuel ? toNumber(ad.consumptions.fuel.combined) : null,
        previousOwners: toNumber(ad.numberOfPreviousOwners),
        generalInspection: formatYearMonth(ad.generalInspection),
        accidentDamaged: typeof ad.accidentDamaged === 'boolean' ? ad.accidentDamaged : null,
        damageUnrepaired: ad.damageUnrepaired === true ? true : null,
        reserved: ad.reserved === true ? true : null
    };

    return Object.fromEntries(Object.entries(specs).filter(([, value]) => value !== null && value !== undefined && value !== ''));
}

// Search API images come in sizes (l=360, xl=640, xxl=1024, xxxl=1600 px);
// the Seller API only gives a single `ref`.
function mapImage(image) {
    if (typeof image === 'string') {
        return { url: image, medium: image, thumb: image };
    }
    if (!image) {
        return null;
    }
    const url = image.xxxl || image.xxl || image.xl || image.l || image.ref;
    if (!url) {
        return null;
    }
    return { url, medium: image.xxl || image.xl || url, thumb: image.l || image.m || image.xl || url };
}

/** @returns {Vehicle} */
function mapAdToVehicle(ad) {
    const id = String(ad.mobileAdId);
    const make = formatMake(ad.make);
    const model = ad.model || '';
    const variant = ad.modelDescription || '';
    const title = [make, variant || model].filter(Boolean).join(' ');
    const kw = toNumber(ad.power);

    return {
        id,
        slug: slugify(`${make} ${model} ${id}`),
        make,
        model,
        title,
        vin: typeof ad.vin === 'string' && /^[A-HJ-NPR-Z0-9]{17}$/i.test(ad.vin.trim()) ? ad.vin.trim().toUpperCase() : null,
        condition: ad.condition || null,
        price: mapPrice(ad.price),
        images: (ad.images || []).map(mapImage).filter(Boolean),
        mileage: toNumber(ad.mileage),
        firstRegistration: formatYearMonth(ad.firstRegistration),
        fuel: ad.fuel ? FUEL_LABELS[ad.fuel] || ad.fuel : null,
        gearbox: ad.gearbox ? GEARBOX_LABELS[ad.gearbox] || ad.gearbox : null,
        power: kw ? { kw, ps: Math.round(kw * 1.35962) } : null,
        description: typeof (ad.plainTextDescription || ad.description) === 'string' ? (ad.plainTextDescription || ad.description).trim() : '',
        features: mapFeatures(ad),
        specifications: mapSpecifications(ad),
        seller: SELLER_CONTACT,
        listingUrl: typeof ad.detailPageUrl === 'string' && ad.detailPageUrl.startsWith('https://suchen.mobile.de/')
            ? ad.detailPageUrl : `https://suchen.mobile.de/fahrzeuge/details.html?id=${encodeURIComponent(id)}`,
        updatedAt: ad.modificationDate || ad.creationDate || null
    };
}

module.exports = {
    SELLER_CONTACT,
    getConfig,
    fetchAds,
    fetchSearchAds,
    fetchAdImages,
    fetchInventory,
    mapAdToVehicle,
    slugify
};
