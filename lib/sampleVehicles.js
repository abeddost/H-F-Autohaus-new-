// Shown only while no valid synced inventory exists (e.g. before the first
// successful mobile.de sync). Every entry is flagged with isSample: true.

const { SELLER_CONTACT } = require('./mobileDe');

const PROFILE_URL = 'https://home.mobile.de/HFAUTOMOBILEMAINZKOSTHEIM';

module.exports = [
    {
        id: 'sample-1',
        slug: 'beispiel-limousine',
        make: 'Beispiel',
        model: 'Limousine',
        title: 'Beispielfahrzeug Limousine',
        price: { amount: null, currency: 'EUR', type: 'ON_REQUEST', vatDeductible: false },
        images: [],
        mileage: null,
        firstRegistration: null,
        fuel: null,
        gearbox: null,
        power: null,
        description: 'Unser aktueller Fahrzeugbestand wird gerade geladen. Alle Angebote finden Sie auf mobile.de.',
        features: [],
        specifications: {},
        seller: SELLER_CONTACT,
        listingUrl: PROFILE_URL,
        updatedAt: null,
        isSample: true
    },
    {
        id: 'sample-2',
        slug: 'beispiel-suv',
        make: 'Beispiel',
        model: 'SUV',
        title: 'Beispielfahrzeug SUV',
        price: { amount: null, currency: 'EUR', type: 'ON_REQUEST', vatDeductible: false },
        images: [],
        mileage: null,
        firstRegistration: null,
        fuel: null,
        gearbox: null,
        power: null,
        description: 'Unser aktueller Fahrzeugbestand wird gerade geladen. Alle Angebote finden Sie auf mobile.de.',
        features: [],
        specifications: {},
        seller: SELLER_CONTACT,
        listingUrl: PROFILE_URL,
        updatedAt: null,
        isSample: true
    }
];
