// Inventory persistence: Upstash Redis / Vercel KV in production, a local JSON
// file in development. Both expose the same async get/set interface.

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const INVENTORY_KEY = 'hf:inventory';
const STATUS_KEY = 'hf:inventory:status';

function getRedisConfig(env) {
    // Vercel KV and the Upstash marketplace integration use different names.
    const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
    return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function createRedisStore({ url, token }, fetchImpl = fetch) {
    async function command(args) {
        const response = await fetchImpl(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(args),
            signal: AbortSignal.timeout(10000)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.error) {
            throw new Error(`Redis ${args[0]} failed: ${data.error || response.status}`);
        }
        return data.result;
    }

    return {
        kind: 'redis',
        async get(key) {
            const raw = await command(['GET', key]);
            return raw ? JSON.parse(raw) : null;
        },
        async set(key, value) {
            await command(['SET', key, JSON.stringify(value)]);
        }
    };
}

function createFileStore(filePath) {
    async function readAll() {
        try {
            return JSON.parse(await fs.readFile(filePath, 'utf8'));
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }

    return {
        kind: 'file',
        filePath,
        async get(key) {
            const data = await readAll();
            return data[key] ?? null;
        },
        async set(key, value) {
            const data = await readAll();
            data[key] = value;
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            // Write-then-rename so a crash never leaves half a file behind.
            const tmpPath = `${filePath}.${process.pid}.tmp`;
            await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
            await fs.rename(tmpPath, filePath);
        }
    };
}

function createInventoryStore({ env = process.env, fetchImpl = fetch } = {}) {
    const redis = getRedisConfig(env);
    if (redis) {
        return createRedisStore(redis, fetchImpl);
    }

    if (env.VERCEL) {
        // Serverless filesystems are read-only (except /tmp, which is not shared or durable).
        console.warn('Inventory: no Upstash Redis / Vercel KV configured; falling back to ephemeral /tmp storage.');
        return createFileStore(path.join(os.tmpdir(), 'hf-inventory.json'));
    }

    return createFileStore(env.INVENTORY_FILE || path.join(__dirname, '..', 'data', 'inventory.json'));
}

module.exports = {
    INVENTORY_KEY,
    STATUS_KEY,
    createInventoryStore,
    createFileStore,
    createRedisStore
};
