const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CACHE_FILE = path.join(DATA_DIR, 'strategy_cache.json');

const DEFAULT_CONFIG = { maxAgeMinutes: 60, maxEntries: 500, enabled: true };

class StrategyCache {
    constructor(options = {}) {
        this.config = { ...DEFAULT_CONFIG, ...options };
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    generateKey(data) {
        return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    }

    get(key) {
        if (!this.config.enabled) return null;
        const entry = this.cache.get(key);
        if (!entry) { this.misses++; return null; }
        const age = Date.now() - entry.timestamp;
        if (age > this.config.maxAgeMinutes * 60000) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        this.hits++;
        return entry.result;
    }

    set(key, result) {
        if (!this.config.enabled) return;
        this.cache.set(key, { result, timestamp: Date.now() });
        if (this.cache.size > this.config.maxEntries) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    getStats() {
        const total = this.hits + this.misses;
        return {
            enabled: this.config.enabled,
            entries: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? Math.round(this.hits / total * 100) : 0
        };
    }
}

let cacheInstance = null;
function getCache(options) {
    if (!cacheInstance) cacheInstance = new StrategyCache(options);
    return cacheInstance;
}

module.exports = { StrategyCache, getCache };
