// Google Merchant Center vehicle ads feed (tab-separated primary data source).
// Spec: https://support.google.com/merchants/answer/11192663
// Values come from the same inventory that renders /bestand/:slug, so price,
// mileage and identifiers always match the landing page.

const { vehicleUrl, label } = require('./vehicleLabels');

const COLUMNS = [
    'id', 'title', 'description', 'link', 'image_link', 'additional_image_link',
    'price', 'condition', 'google_product_category', 'brand', 'model', 'year',
    'mileage', 'vin', 'color', 'body_style', 'engine', 'date_first_registered',
    'fuel_consumption', 'co2_emissions', 'store_code', 'vehicle_fulfillment', 'link_template'
];

const BODY_STYLES = {
    Limousine: 'sedan', EstateCar: 'wagon', OffRoad: 'suv', SmallCar: 'hatchback',
    SportsCar: 'coupe', Van: 'van', Cabrio: 'convertible'
};

// The inventory stores German fuel labels (see FUEL_LABELS in mobileDe.js).
const ENGINES = {
    Benzin: 'petrol', Diesel: 'diesel', Elektro: 'electric',
    'Hybrid (Benzin/Elektro)': 'hybrid', 'Hybrid (Diesel/Elektro)': 'hybrid',
    'Autogas (LPG)': 'lpg', 'Erdgas (CNG)': 'natural_gas'
};

const clean = (value) => String(value ?? '').replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

function colorText(specs) {
    const base = specs.exteriorColor ? label('color', specs.exteriorColor) : null;
    return base || clean(specs.manufacturerColorName) || '';
}

/** Vehicles Google would reject outright (no price or no image) are skipped. */
function isFeedEligible(vehicle) {
    return vehicle.price && vehicle.price.amount != null && vehicle.images.length > 0;
}

function feedRow(vehicle, { storeCode } = {}) {
    const specs = vehicle.specifications || {};
    const link = vehicleUrl(vehicle);
    return {
        id: vehicle.id,
        title: vehicle.title,
        description: vehicle.description.slice(0, 5000),
        link,
        image_link: vehicle.images[0].url,
        additional_image_link: vehicle.images.slice(1, 11).map((image) => image.url).join(','),
        price: `${vehicle.price.amount.toFixed(2)} ${vehicle.price.currency || 'EUR'}`,
        condition: vehicle.condition === 'NEW' ? 'new' : 'used',
        google_product_category: '916',
        brand: vehicle.make,
        model: vehicle.model,
        year: vehicle.firstRegistration ? vehicle.firstRegistration.slice(0, 4) : '',
        mileage: vehicle.mileage != null ? `${vehicle.mileage} KM` : '',
        vin: vehicle.vin || '',
        color: colorText(specs),
        body_style: BODY_STYLES[specs.category] || '',
        engine: ENGINES[vehicle.fuel] || (vehicle.fuel ? 'other' : ''),
        date_first_registered: vehicle.firstRegistration || '',
        fuel_consumption: specs.consumptionCombined != null ? `${specs.consumptionCombined} l/100km` : '',
        co2_emissions: specs.co2Combined != null ? `${specs.co2Combined} g/km` : '',
        // In-store offers need the dealership's Business Profile store code.
        store_code: storeCode || '',
        vehicle_fulfillment: storeCode ? `in_store:${storeCode}` : '',
        link_template: storeCode ? `${link}?store={store_code}` : ''
    };
}

function buildVehicleFeed(vehicles, options = {}) {
    const rows = vehicles.filter(isFeedEligible).map((vehicle) => feedRow(vehicle, options));
    return [COLUMNS, ...rows.map((row) => COLUMNS.map((column) => clean(row[column])))]
        .map((cells) => cells.join('\t'))
        .join('\n') + '\n';
}

module.exports = { buildVehicleFeed, feedRow, isFeedEligible, COLUMNS };
