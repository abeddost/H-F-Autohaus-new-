const test = require('node:test');
const assert = require('node:assert/strict');
const { mapAdToVehicle, fetchInventory, getConfig } = require('../lib/mobileDe');
const fixture = require('./fixtures/ad.json');

const env = {
    MOBILE_DE_USERNAME: 'api-user',
    MOBILE_DE_PASSWORD: 'secret',
    MOBILE_DE_SELLER_ID: '26132851'
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('maps a Seller API ad into a Vehicle', () => {
    const vehicle = mapAdToVehicle(fixture);

    assert.equal(vehicle.id, '412345678');
    assert.equal(vehicle.make, 'Mercedes-Benz');
    assert.equal(vehicle.model, 'C 220');
    assert.equal(vehicle.title, 'Mercedes-Benz C 220 d T-Modell AMG Line');
    assert.equal(vehicle.slug, 'mercedes-benz-c-220-412345678');
    assert.deepEqual(vehicle.price, { amount: 28990, currency: 'EUR', type: 'FIXED', vatDeductible: true });
    assert.equal(vehicle.images.length, 2);
    assert.match(vehicle.images[0].url, /^https:\/\/img\.classistatic\.de\//);
    assert.equal(vehicle.mileage, 64500);
    assert.equal(vehicle.firstRegistration, '2020-05');
    assert.equal(vehicle.fuel, 'Diesel');
    assert.equal(vehicle.gearbox, 'Automatik');
    assert.deepEqual(vehicle.power, { kw: 143, ps: 194 });
    assert.equal(vehicle.description, 'Scheckheftgepflegt, unfallfrei.');
    assert.deepEqual(vehicle.features, [
        'ABS', 'ESP', 'Navigationssystem', '2-Zonen-Klimaautomatik',
        'Einparkhilfe vorne', 'Rückfahrkamera', 'AMG Line'
    ]);
    assert.equal(vehicle.specifications.exteriorColor, 'BLACK');
    assert.equal(vehicle.specifications.manufacturerColorName, 'Obsidianschwarz metallic');
    assert.equal(vehicle.specifications.generalInspection, '2027-05');
    assert.equal(vehicle.specifications.previousOwners, 1);
    assert.equal(vehicle.specifications.vin, undefined, 'VIN must not be exposed');
    assert.equal(vehicle.listingUrl, 'https://suchen.mobile.de/fahrzeuge/details.html?id=412345678');
    assert.equal(vehicle.seller.email, 'hf.fahrzeuge@gmail.com');
});

test('price on request has no amount; missing fields map to null', () => {
    const vehicle = mapAdToVehicle({ mobileAdId: 7, make: 'BMW', model: '320', price: { type: 'ON_REQUEST' } });

    assert.equal(vehicle.make, 'BMW');
    assert.equal(vehicle.price.amount, null);
    assert.equal(vehicle.mileage, null);
    assert.equal(vehicle.firstRegistration, null);
    assert.equal(vehicle.power, null);
    assert.deepEqual(vehicle.images, []);
});

test('getConfig requires all credentials', () => {
    assert.throws(() => getConfig({ MOBILE_DE_USERNAME: 'x' }), /not configured/);
});

test('fetchInventory sends Basic Auth and the API Accept header, and loads missing images', async () => {
    const calls = [];
    const { images, ...adWithoutImages } = fixture;
    const fetchImpl = async (url, options) => {
        calls.push({ url, options });
        if (url.endsWith('/ads')) {
            return jsonResponse({ ads: [adWithoutImages] });
        }
        return jsonResponse({ images });
    };

    const vehicles = await fetchInventory({ env, fetchImpl });

    assert.equal(calls[0].url, 'https://services.mobile.de/seller-api/sellers/26132851/ads');
    assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from('api-user:secret').toString('base64')}`);
    assert.equal(calls[0].options.headers.Accept, 'application/vnd.de.mobile.api+json');
    assert.equal(calls[1].url, 'https://services.mobile.de/seller-api/sellers/26132851/ads/412345678/images');
    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0].images.length, 2);
});

test('fetchInventory rejects on API errors', async () => {
    const fetchImpl = async () => new Response('', { status: 401 });
    await assert.rejects(fetchInventory({ env, fetchImpl }), /responded 401/);
});

test('Search API imports every page, loads full details per ad and maps image sizes', async () => {
    const calls = [];
    const summary = id => ({...fixture, mobileAdId:id, mobileSellerId:env.MOBILE_DE_SELLER_ID, images:[{xxxl:'https://img.classistatic.de/summary.jpg'}], plainTextDescription:'', vin:undefined});
    const detail = id => ({...summary(id), vin:'W0LPD9EC4H1044467', plainTextDescription:'Fahrzeugbeschreibung',
        images:[{xxxl:'https://img.classistatic.de/car.jpg', xxl:'https://img.classistatic.de/car-1024.jpg', l:'https://img.classistatic.de/car-360.jpg'}, {xxxl:'https://img.classistatic.de/car-2.jpg'}]});
    const vehicles = await fetchInventory({env:{...env,MOBILE_DE_API:'search'},fetchImpl:async url => {
        const parsed = new URL(url);
        calls.push(parsed);
        const adMatch = /^\/search-api\/ad\/(\w+)$/.exec(parsed.pathname);
        if (adMatch) return jsonResponse(detail(adMatch[1]));
        const page = Number(parsed.searchParams.get('page.number'));
        return jsonResponse({total:2,maxPages:2,currentPage:page,ads:[summary(String(page))]});
    }});
    const listCalls = calls.filter(call => call.pathname === '/search-api/search');
    assert.equal(listCalls.length,2);
    assert.equal(listCalls[0].searchParams.get('customerId'),env.MOBILE_DE_SELLER_ID);
    assert.deepEqual(calls.filter(call => call.pathname.startsWith('/search-api/ad/')).map(call => call.pathname).sort(), ['/search-api/ad/1','/search-api/ad/2']);
    assert.equal(vehicles.length,2);
    assert.deepEqual(vehicles[0].images[0], {url:'https://img.classistatic.de/car.jpg', medium:'https://img.classistatic.de/car-1024.jpg', thumb:'https://img.classistatic.de/car-360.jpg'});
    assert.equal(vehicles[0].images.length,2);
    assert.equal(vehicles[0].vin,'W0LPD9EC4H1044467');
    assert.equal(vehicles[0].description,'Fahrzeugbeschreibung');
});

test('Search API rejects partial results, wrong sellers and search warnings', async () => {
    const ad = {...fixture,mobileSellerId:env.MOBILE_DE_SELLER_ID};
    for (const data of [
        {total:2,maxPages:1,currentPage:1,ads:[ad]},
        {total:1,maxPages:1,currentPage:1,ads:[{...ad,mobileSellerId:'other'}]},
        {total:1,maxPages:1,currentPage:1,ads:[ad],errors:[{key:'invalid-search-parameter'}]},
        {total:2,maxPages:2,currentPage:1,ads:[ad]}
    ]) {
        await assert.rejects(fetchInventory({env:{...env,MOBILE_DE_API:'search'},fetchImpl:async()=>jsonResponse(data)}));
    }
});

test('Search API accepts a confirmed empty inventory', async () => {
    const vehicles = await fetchInventory({env:{...env,MOBILE_DE_API:'search'},fetchImpl:async()=>jsonResponse({total:0,maxPages:0,currentPage:1,ads:[]})});
    assert.deepEqual(vehicles,[]);
});
