// Authorizes inventory sync requests.
// Accepts `Authorization: Bearer <SYNC_SECRET|CRON_SECRET>` (Vercel Cron sends
// CRON_SECRET this way) or `x-sync-secret: <SYNC_SECRET>`. Fails closed when no
// secret is configured.

const crypto = require('crypto');

function safeEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isSyncAuthorized(headers, env = process.env) {
    const secrets = [env.SYNC_SECRET, env.CRON_SECRET].filter((secret) => secret && secret.length >= 16);
    if (secrets.length === 0) {
        return false;
    }

    const authorization = headers.authorization || '';
    const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
    const headerSecret = headers['x-sync-secret'] || null;

    return secrets.some((secret) => (bearer && safeEqual(bearer, secret)) || (headerSecret && safeEqual(headerSecret, secret)));
}

module.exports = { isSyncAuthorized };
