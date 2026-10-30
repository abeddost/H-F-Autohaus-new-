const test = require('node:test');
const assert = require('node:assert/strict');
const { titleParts } = require('../lib/vehicleLabels');

test('titleParts splits a mobile.de title into name and highlights', () => {
    assert.deepEqual(titleParts({ make: 'Land Rover', title: 'Land Rover Defender D240 S AWD/7 SITZER/PANO/AHK/MERIDIAN' }), {
        name: 'Defender D240 S AWD',
        highlights: ['7 Sitzer', 'Pano', 'AHK', 'Meridian']
    });
});

test('titleParts keeps slashes between digits and Start/Stop together', () => {
    assert.equal(titleParts({ make: 'Mercedes-Benz', title: 'Mercedes-Benz Vito Kasten 110/114/116/119 CDI RWD/AHK' }).name, 'Vito Kasten 110/114/116/119 CDI RWD');
    assert.deepEqual(titleParts({ make: 'Opel', title: 'Opel Zafira C Edition 7-SITZER/KAMERA/Start/Stop' }), {
        name: 'Zafira C Edition 7-Sitzer',
        highlights: ['Kamera', 'Start-Stop']
    });
});

test('titleParts falls back to make and model without a title', () => {
    assert.deepEqual(titleParts({ make: 'VW', model: 'Golf' }), { name: 'VW Golf', highlights: [] });
});
