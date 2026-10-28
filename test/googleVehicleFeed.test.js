const test = require('node:test');
const assert = require('node:assert/strict');
const { buildVehicleFeed, COLUMNS } = require('../lib/googleVehicleFeed');
const { mapAdToVehicle } = require('../lib/mobileDe');
const fixture = require('./fixtures/ad.json');

const parse = (tsv) => {
    const [header, ...rows] = tsv.replace(/\n$/, '').split('\n').map((line) => line.split('\t'));
    return rows.map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i]])));
};

test('feed rows match the landing page data', () => {
    const vehicle = mapAdToVehicle({ ...fixture, vin: 'WDD2050041F000001', description: 'Zeile 1\n\tZeile 2' });
    const [row] = parse(buildVehicleFeed([vehicle]));

    assert.equal(row.id, '412345678');
    assert.equal(row.link, 'https://hf-autos.de/bestand/mercedes-benz-c-220-412345678');
    assert.equal(row.price, '28990.00 EUR');
    assert.equal(row.condition, 'used');
    assert.equal(row.google_product_category, '916');
    assert.equal(row.brand, 'Mercedes-Benz');
    assert.equal(row.model, 'C 220');
    assert.equal(row.year, '2020');
    assert.equal(row.mileage, '64500 KM');
    assert.equal(row.vin, 'WDD2050041F000001');
    assert.equal(row.color, 'Schwarz');
    assert.equal(row.body_style, 'wagon');
    assert.equal(row.engine, 'diesel');
    assert.equal(row.date_first_registered, '2020-05');
    assert.equal(row.description, 'Zeile 1 Zeile 2', 'tabs and newlines never break the TSV');
    assert.equal(row.additional_image_link, 'https://img.classistatic.de/api/v1/mo-prod/images/bb/bbbb-2?rule=mo-640.jpg');
    assert.equal(row.vehicle_fulfillment, '');
});

test('store code enables in-store fulfillment', () => {
    const [row] = parse(buildVehicleFeed([mapAdToVehicle(fixture)], { storeCode: 'HF01' }));
    assert.equal(row.store_code, 'HF01');
    assert.equal(row.vehicle_fulfillment, 'in_store:HF01');
    assert.equal(row.link_template, 'https://hf-autos.de/bestand/mercedes-benz-c-220-412345678?store={store_code}');
});

test('vehicles without price or image are left out; header is always present', () => {
    const noPrice = mapAdToVehicle({ ...fixture, mobileAdId: '1', price: { type: 'ON_REQUEST' } });
    const noImage = mapAdToVehicle({ ...fixture, mobileAdId: '2', images: [] });
    const tsv = buildVehicleFeed([noPrice, noImage]);
    assert.equal(tsv, COLUMNS.join('\t') + '\n');
});
