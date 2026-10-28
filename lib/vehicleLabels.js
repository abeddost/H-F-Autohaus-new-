// German display labels for mobile.de enum values, plus the schema.org
// structured data for a vehicle detail page.

const SITE_URL = 'https://hf-autos.de';

const LABELS = {
    category: {
        Cabrio: 'Cabrio / Roadster', EstateCar: 'Kombi', Limousine: 'Limousine', OffRoad: 'SUV / Geländewagen',
        SmallCar: 'Kleinwagen', SportsCar: 'Sportwagen / Coupé', Van: 'Van / Kleinbus', OtherCar: 'Andere'
    },
    color: {
        BEIGE: 'Beige', BLACK: 'Schwarz', BLUE: 'Blau', BROWN: 'Braun', GOLD: 'Gold', GREEN: 'Grün', GREY: 'Grau',
        ORANGE: 'Orange', PURPLE: 'Violett', RED: 'Rot', SILVER: 'Silber', WHITE: 'Weiß', YELLOW: 'Gelb',
        OTHER_INTERIOR_COLOR: 'Andere'
    },
    interiorType: {
        FABRIC: 'Stoff', LEATHER: 'Vollleder', PARTIAL_LEATHER: 'Teilleder', ALCANTARA: 'Alcantara',
        VELOUR: 'Velours', OTHER_INTERIOR_TYPE: 'Andere'
    },
    doors: { TWO_OR_THREE: '2/3', FOUR_OR_FIVE: '4/5', SIX_OR_SEVEN: '6/7' },
    driveType: { FRONT: 'Frontantrieb', REAR: 'Heckantrieb', ALL_WHEEL: 'Allradantrieb' },
    emissionSticker: {
        EMISSIONSSTICKER_GREEN: '4 (Grün)', EMISSIONSSTICKER_YELLOW: '3 (Gelb)',
        EMISSIONSSTICKER_RED: '2 (Rot)', EMISSIONSSTICKER_NONE: 'Keine'
    },
    condition: { USED: 'Gebrauchtfahrzeug', NEW: 'Neufahrzeug' }
};

function label(group, value) {
    return (LABELS[group] && LABELS[group][value]) || value || null;
}

function formatEmissionClass(value) {
    // EURO6D_TEMP -> Euro 6d-TEMP
    const match = /^EURO(\d)([A-Z]*)(?:_(\w+))?$/.exec(value || '');
    if (!match) {
        return value || null;
    }
    return `Euro ${match[1]}${match[2].toLowerCase()}${match[3] ? `-${match[3]}` : ''}`;
}

const fmtNumber = (n) => new Intl.NumberFormat('de-DE').format(n);
const fmtMonth = (ym) => (ym ? ym.split('-').reverse().join('/') : null);

function priceText(vehicle) {
    return vehicle.price.amount != null ? `${fmtNumber(vehicle.price.amount)} €` : 'Preis auf Anfrage';
}

/** Rows for the "Technische Daten" table, skipping anything mobile.de didn't send. */
function specRows(vehicle) {
    const s = vehicle.specifications || {};
    const rows = [
        ['Fahrzeugzustand', label('condition', vehicle.condition)],
        ['Kategorie', label('category', s.category)],
        ['Erstzulassung', fmtMonth(vehicle.firstRegistration)],
        ['Kilometerstand', vehicle.mileage != null ? `${fmtNumber(vehicle.mileage)} km` : null],
        ['Leistung', vehicle.power ? `${vehicle.power.kw} kW (${vehicle.power.ps} PS)` : null],
        ['Kraftstoff', vehicle.fuel],
        ['Getriebe', vehicle.gearbox],
        ['Antrieb', label('driveType', s.driveType)],
        ['Hubraum', s.cubicCapacity ? `${fmtNumber(s.cubicCapacity)} cm³` : null],
        ['Fahrzeughalter', s.previousOwners != null ? String(s.previousOwners) : null],
        ['HU', fmtMonth(s.generalInspection)],
        ['Außenfarbe', exteriorColorText(s)],
        ['Innenausstattung', [label('interiorType', s.interiorType), s.interiorColor && s.interiorColor !== 'OTHER_INTERIOR_COLOR' ? label('color', s.interiorColor) : null].filter(Boolean).join(', ') || null],
        ['Türen', label('doors', s.doors)],
        ['Sitzplätze', s.seats != null ? String(s.seats) : null],
        ['Schadstoffklasse', formatEmissionClass(s.emissionClass)],
        ['Umweltplakette', label('emissionSticker', s.emissionSticker)],
        ['Verbrauch (komb.)', s.consumptionCombined != null ? `${String(s.consumptionCombined).replace('.', ',')} l/100 km` : null],
        ['CO₂-Emissionen (komb.)', s.co2Combined != null ? `${s.co2Combined} g/km` : null],
        ['Unfallfahrzeug', s.accidentDamaged === true ? 'Ja' : s.accidentDamaged === false ? 'Nein' : null],
        ['Nicht reparierter Schaden', s.damageUnrepaired ? 'Ja' : null],
        ['FIN', vehicle.vin],
        ['Fahrzeug-Nr.', vehicle.id]
    ];
    return rows.filter(([, value]) => value);
}

function titleCase(value) {
    return value === value.toUpperCase()
        ? value.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, sep, letter) => sep + letter.toUpperCase())
        : value;
}

// "Grau (You Drive Me Crazy)": base colour plus the manufacturer's paint name.
function exteriorColorText(s) {
    const base = s.exteriorColor ? (LABELS.color[s.exteriorColor] || s.exteriorColor) : null;
    const name = s.manufacturerColorName ? titleCase(s.manufacturerColorName.trim()) : null;
    if (base && name && name.toLowerCase() !== base.toLowerCase()) {
        return `${base} (${name})`;
    }
    return base || name;
}

function vehicleUrl(vehicle) {
    return `${SITE_URL}/bestand/${vehicle.slug}`;
}

/** schema.org Car + Offer, as recommended for vehicle listing pages. */
function vehicleJsonLd(vehicle) {
    const s = vehicle.specifications || {};
    const data = {
        '@context': 'https://schema.org',
        '@type': 'Car',
        name: vehicle.title,
        url: vehicleUrl(vehicle),
        sku: vehicle.id,
        brand: { '@type': 'Brand', name: vehicle.make },
        model: vehicle.model,
        vehicleIdentificationNumber: vehicle.vin || undefined,
        image: vehicle.images.slice(0, 10).map((image) => image.url),
        description: vehicle.description ? vehicle.description.slice(0, 5000) : undefined,
        itemCondition: vehicle.condition === 'NEW' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
        mileageFromOdometer: vehicle.mileage != null ? { '@type': 'QuantitativeValue', value: vehicle.mileage, unitCode: 'KMT' } : undefined,
        dateVehicleFirstRegistered: vehicle.firstRegistration || undefined,
        vehicleModelDate: vehicle.firstRegistration ? vehicle.firstRegistration.slice(0, 4) : undefined,
        fuelType: vehicle.fuel || undefined,
        vehicleTransmission: vehicle.gearbox || undefined,
        color: s.exteriorColor ? (LABELS.color[s.exteriorColor] || s.exteriorColor) : undefined,
        bodyType: label('category', s.category) || undefined,
        vehicleSeatingCapacity: s.seats || undefined,
        numberOfPreviousOwners: s.previousOwners != null ? s.previousOwners : undefined,
        vehicleEngine: vehicle.power ? {
            '@type': 'EngineSpecification',
            enginePower: { '@type': 'QuantitativeValue', value: vehicle.power.kw, unitCode: 'KWT' }
        } : undefined,
        offers: {
            '@type': 'Offer',
            url: vehicleUrl(vehicle),
            price: vehicle.price.amount != null ? vehicle.price.amount : undefined,
            priceCurrency: vehicle.price.currency || 'EUR',
            availability: 'https://schema.org/InStock',
            itemCondition: vehicle.condition === 'NEW' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
            seller: {
                '@type': 'AutoDealer',
                name: 'H&F Autohaus Bodenheim',
                telephone: '+4917662878366',
                url: SITE_URL,
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: 'Am Kümmerling 41a',
                    postalCode: '55294',
                    addressLocality: 'Bodenheim',
                    addressCountry: 'DE'
                }
            }
        }
    };
    // Safe to embed in <script>: drop undefined keys, escape "<".
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** WhatsApp message for a vehicle inquiry, marked as coming from the website. */
function whatsappVehicleText(vehicle) {
    return [
        '🌐 *Fahrzeuganfrage über hf-autos.de*',
        '',
        `🚗 *Fahrzeug:* ${vehicle.title}`,
        `🔖 *Fahrzeug-Nr.:* ${vehicle.id}`,
        `💶 *Preis:* ${priceText(vehicle)}`,
        `🔗 ${vehicleUrl(vehicle)}`,
        '',
        'Hallo, ich interessiere mich für dieses Fahrzeug.'
    ].join('\n');
}

function whatsappVehicleUrl(vehicle) {
    return `https://wa.me/4917662878366?text=${encodeURIComponent(whatsappVehicleText(vehicle))}`;
}

module.exports = { whatsappVehicleText, whatsappVehicleUrl, label, specRows, priceText, fmtNumber, fmtMonth, vehicleUrl, vehicleJsonLd, SITE_URL };
