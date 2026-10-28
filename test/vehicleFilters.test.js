const test = require('node:test');
const assert = require('node:assert/strict');
const { filterVehicles } = require('../lib/vehicleFilters');
const vehicles = [
    { id:'1', title:'BMW 320', make:'BMW', fuel:'Diesel', gearbox:'Automatik', price:{amount:20000}, mileage:50000, firstRegistration:'2021-06', features:['Sitzheizung'] },
    { id:'2', title:'BMW 118', make:'BMW', fuel:'Benzin', gearbox:'Schaltgetriebe', price:{amount:12000}, mileage:90000, firstRegistration:'2018-02' },
    { id:'3', title:'Audi A4', make:'Audi', price:{amount:null}, mileage:null, firstRegistration:null }
];
test('combines text, brand, fuel, transmission and numeric filters', () => {
    const result = filterVehicles(vehicles, {q:'sitzHEIZUNG',make:'BMW',fuel:'Diesel',gearbox:'Automatik',maxPrice:'21000',minYear:'2020',maxMileage:'60000'});
    assert.deepEqual(result.vehicles.map(v=>v.id), ['1']);
    assert.deepEqual(result.options.make,['Audi','BMW']);
    assert.equal(result.total,3);
    assert.equal(filterVehicles(vehicles,{maxPrice:'19000',minYear:'2020'}).vehicles.length,0);
});
test('sorts known prices first in both directions and excludes unknown numeric values from filters', () => {
    assert.deepEqual(filterVehicles(vehicles,{sort:'price-desc'}).vehicles.map(v=>v.id),['1','2','3']);
    assert.deepEqual(filterVehicles(vehicles,{sort:'price-asc'}).vehicles.map(v=>v.id),['2','1','3']);
    assert.deepEqual(filterVehicles(vehicles,{maxMileage:'100000'}).vehicles.map(v=>v.id),['1','2']);
});
test('ignores structured and invalid query values without throwing', () => {
    assert.equal(filterVehicles(vehicles,{q:{bad:'input'},maxPrice:'nope',sort:['price-asc']}).vehicles.length,3);
});

test('featured vehicles: top 5 by price, only cars with price and photo', () => {
    const { pickFeaturedVehicles } = require('../lib/vehicleFilters');
    const car = (id, amount, images = [{ url: 'x.jpg' }]) => ({ id, price: { amount }, images });
    const picked = pickFeaturedVehicles([
        car('a', 9000), car('b', 45000), car('c', null), car('d', 30000, []),
        car('e', 21000), car('f', 12000), car('g', 33000), car('h', 15000), car('i', 8000)
    ]);
    assert.deepEqual(picked.map((v) => v.id), ['b', 'g', 'e', 'h', 'f']);
    assert.deepEqual(pickFeaturedVehicles([]), []);
});
