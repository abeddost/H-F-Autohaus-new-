// Inventory sync and read logic, independent of Express so it can be tested.

const { fetchInventory } = require('./mobileDe');
const { INVENTORY_KEY, STATUS_KEY } = require('./inventoryStore');
const sampleVehicles = require('./sampleVehicles');

function isValidInventory(record) {
    return Boolean(record && Array.isArray(record.vehicles) && record.lastSync);
}

/**
 * Pulls the current ads from mobile.de and replaces the stored inventory.
 * Listings that are no longer returned (sold / removed) drop out.
 * On any error the stored inventory is left untouched and the error is
 * recorded in the status record.
 */
async function syncInventory({ store, fetchVehicles = fetchInventory, now = () => new Date() }) {
    const startedAt = now().toISOString();
    const previous = await store.get(INVENTORY_KEY).catch(() => null);
    const previousById = new Map(
        (isValidInventory(previous) ? previous.vehicles : []).map((vehicle) => [vehicle.id, vehicle])
    );

    let vehicles;
    try {
        vehicles = await fetchVehicles();
        if (!Array.isArray(vehicles)) {
            throw new Error('Inventory fetch returned no vehicle list');
        }
    } catch (error) {
        const previousStatus = (await store.get(STATUS_KEY).catch(() => null)) || {};
        await store.set(STATUS_KEY, {
            ...previousStatus,
            lastAttempt: startedAt,
            ok: false,
            lastError: error.message
        }).catch(() => {});
        return { ok: false, error: error.message, lastSync: previous ? previous.lastSync || null : null };
    }

    const nextIds = new Set(vehicles.map((vehicle) => vehicle.id));
    const stats = { total: vehicles.length, added: 0, updated: 0, unchanged: 0, removed: 0 };

    vehicles.forEach((vehicle) => {
        const before = previousById.get(vehicle.id);
        if (!before) {
            stats.added++;
        } else if (JSON.stringify(before) !== JSON.stringify(vehicle)) {
            stats.updated++;
        } else {
            stats.unchanged++;
        }
    });
    previousById.forEach((vehicle, id) => {
        if (!nextIds.has(id)) {
            stats.removed++;
        }
    });

    await store.set(INVENTORY_KEY, { vehicles, lastSync: startedAt });
    await store.set(STATUS_KEY, { lastSync: startedAt, lastAttempt: startedAt, ok: true, lastError: null, stats });

    return { ok: true, lastSync: startedAt, stats };
}

/** Returns the synced inventory, or sample vehicles if none was ever stored. */
async function getInventory({ store }) {
    let record = null;
    try {
        record = await store.get(INVENTORY_KEY);
    } catch (error) {
        console.error('Inventory read failed:', error.message);
    }

    if (isValidInventory(record)) {
        return { source: 'mobile.de', lastSync: record.lastSync, vehicles: record.vehicles };
    }

    return { source: 'sample', lastSync: null, vehicles: sampleVehicles };
}

async function getSyncStatus({ store }) {
    const [status, record] = await Promise.all([
        store.get(STATUS_KEY).catch(() => null),
        store.get(INVENTORY_KEY).catch(() => null)
    ]);

    return {
        storage: store.kind,
        lastSync: isValidInventory(record) ? record.lastSync : null,
        vehicleCount: isValidInventory(record) ? record.vehicles.length : 0,
        lastAttempt: status ? status.lastAttempt || null : null,
        ok: status ? status.ok : null,
        lastError: status ? status.lastError || null : null,
        stats: status ? status.stats || null : null
    };
}

module.exports = {
    syncInventory,
    getInventory,
    getSyncStatus,
    isValidInventory
};
