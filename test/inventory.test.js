const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { syncInventory, getInventory, getSyncStatus } = require('../lib/inventory');
const { createFileStore, INVENTORY_KEY } = require('../lib/inventoryStore');
const { isSyncAuthorized } = require('../lib/syncAuth');

function tempStore() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-inv-'));
    return createFileStore(path.join(dir, 'inventory.json'));
}

const car = (id, extra = {}) => ({ id, slug: `car-${id}`, title: `Car ${id}`, ...extra });

test('returns sample vehicles only while no valid inventory exists', async () => {
    const store = tempStore();
    const before = await getInventory({ store });
    assert.equal(before.source, 'sample');
    assert.ok(before.vehicles.every((vehicle) => vehicle.isSample));

    await syncInventory({ store, fetchVehicles: async () => [] });
    const after = await getInventory({ store });
    assert.equal(after.source, 'mobile.de');
    assert.deepEqual(after.vehicles, [], 'an empty but successful sync is real inventory, not samples');
});

test('sync adds, updates and removes listings', async () => {
    const store = tempStore();
    await syncInventory({ store, fetchVehicles: async () => [car('1'), car('2'), car('3')] });

    const result = await syncInventory({
        store,
        fetchVehicles: async () => [car('1'), car('2', { title: 'Car 2 (reduziert)' }), car('4')]
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.stats, { total: 3, added: 1, updated: 1, unchanged: 1, removed: 1 });
    const inventory = await getInventory({ store });
    assert.deepEqual(inventory.vehicles.map((vehicle) => vehicle.id), ['1', '2', '4']);
});

test('failed sync preserves existing inventory and records the error', async () => {
    const store = tempStore();
    const first = await syncInventory({ store, fetchVehicles: async () => [car('1')] });

    const failed = await syncInventory({
        store,
        fetchVehicles: async () => { throw new Error('mobile.de API responded 503'); }
    });

    assert.equal(failed.ok, false);
    assert.equal(failed.lastSync, first.lastSync);
    const stored = await store.get(INVENTORY_KEY);
    assert.deepEqual(stored.vehicles.map((vehicle) => vehicle.id), ['1']);

    const status = await getSyncStatus({ store });
    assert.equal(status.ok, false);
    assert.equal(status.lastError, 'mobile.de API responded 503');
    assert.equal(status.lastSync, first.lastSync);
    assert.equal(status.vehicleCount, 1);
});

test('failed first sync keeps serving samples', async () => {
    const store = tempStore();
    await syncInventory({ store, fetchVehicles: async () => { throw new Error('boom'); } });
    assert.equal((await getInventory({ store })).source, 'sample');
});

test('sync authorization', () => {
    const env = { SYNC_SECRET: 'sync-secret-0123456789', CRON_SECRET: 'cron-secret-0123456789' };

    assert.equal(isSyncAuthorized({ authorization: 'Bearer sync-secret-0123456789' }, env), true);
    assert.equal(isSyncAuthorized({ authorization: 'Bearer cron-secret-0123456789' }, env), true);
    assert.equal(isSyncAuthorized({ 'x-sync-secret': 'sync-secret-0123456789' }, env), true);
    assert.equal(isSyncAuthorized({ authorization: 'Bearer wrong' }, env), false);
    assert.equal(isSyncAuthorized({}, env), false);
    assert.equal(isSyncAuthorized({ authorization: 'Bearer anything' }, {}), false, 'fails closed without secrets');
    assert.equal(isSyncAuthorized({ authorization: 'Bearer short' }, { SYNC_SECRET: 'short' }), false, 'rejects weak secrets');
});
