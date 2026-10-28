#!/usr/bin/env node

const fs = require('fs');

const inputPath = process.argv[2];
const raw = inputPath ? fs.readFileSync(inputPath, 'utf8') : fs.readFileSync(0, 'utf8');
const rows = parseRows(raw);

if (!rows.length) {
    console.error('No log rows found. Pass a Vercel CSV export or newline-delimited JSON log file.');
    process.exit(1);
}

const byPath = new Map();
const byAgent = new Map();
const byCache = new Map();
let totalBytes = 0;

for (const row of rows) {
    const path = normalizePath(pick(row, ['path', 'pathname', 'url', 'requestPath', 'request_path']) || '/');
    const status = pick(row, ['status', 'statusCode', 'status_code']) || 'unknown';
    const agent = pick(row, ['userAgent', 'user_agent', 'ua', 'User-Agent']) || 'unknown';
    const cache = pick(row, ['cache', 'cacheStatus', 'cache_status', 'x-vercel-cache', 'X-Vercel-Cache']) || 'unknown';
    const bytes = Number(pick(row, ['bytes', 'responseBytes', 'response_bytes', 'transfer', 'size']) || 0);

    totalBytes += Number.isFinite(bytes) ? bytes : 0;
    addMetric(byPath, `${status} ${path}`, bytes);
    addMetric(byAgent, agent.slice(0, 120), bytes);
    addMetric(byCache, cache, bytes);
}

console.log(`Rows: ${rows.length}`);
console.log(`Estimated transfer: ${formatBytes(totalBytes)}`);
printTop('Top paths by transfer', byPath, 25);
printTop('Top user agents by transfer', byAgent, 15);
printTop('Cache status by transfer', byCache, 10);

function parseRows(text) {
    const trimmed = text.trim();
    if (!trimmed) return [];

    if (trimmed[0] === '{') {
        return trimmed
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => JSON.parse(line));
    }

    return parseCsv(trimmed);
}

function parseCsv(text) {
    const lines = text.split(/\r?\n/);
    const headers = splitCsvLine(lines.shift()).map((header) => header.trim());

    return lines
        .filter(Boolean)
        .map((line) => {
            const values = splitCsvLine(line);
            return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
        });
}

function splitCsvLine(line) {
    const values = [];
    let current = '';
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === ',' && !quoted) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current);
    return values;
}

function pick(row, keys) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '') {
            return row[key];
        }
    }

    return undefined;
}

function normalizePath(value) {
    try {
        const url = value.startsWith('http') ? new URL(value) : new URL(value, 'https://hf-autos.de');
        return url.pathname;
    } catch {
        return String(value).split('?')[0];
    }
}

function addMetric(map, key, bytes) {
    const metric = map.get(key) || { requests: 0, bytes: 0 };
    metric.requests += 1;
    metric.bytes += Number.isFinite(Number(bytes)) ? Number(bytes) : 0;
    map.set(key, metric);
}

function printTop(title, map, limit) {
    console.log(`\n${title}`);
    [...map.entries()]
        .sort((a, b) => b[1].bytes - a[1].bytes || b[1].requests - a[1].requests)
        .slice(0, limit)
        .forEach(([key, metric]) => {
            console.log(`${formatBytes(metric.bytes).padStart(10)}  ${String(metric.requests).padStart(6)} req  ${key}`);
        });
}

function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
