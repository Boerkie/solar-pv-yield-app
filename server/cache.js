const cacheStore = new Map();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function getCachedValue(cacheKey) {
  const cacheEntry = cacheStore.get(cacheKey);

  if (!cacheEntry) {
    return null;
  }

  if (Date.now() > cacheEntry.expiresAt) {
    cacheStore.delete(cacheKey);
    return null;
  }

  return cacheEntry.value;
}

export function setCachedValue(cacheKey, value, ttlMs = DEFAULT_TTL_MS) {
  cacheStore.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

export function buildCacheKey(payload) {
  return JSON.stringify({
    site: {
      latitude: roundForCache(payload.site.latitude),
      longitude: roundForCache(payload.site.longitude)
    },
    strings: payload.strings.map((pvString) => ({
      id: pvString.id,
      capacityKwp: roundForCache(pvString.capacityKwp),
      tiltDegrees: roundForCache(pvString.tiltDegrees),
      azimuthDegrees: roundForCache(pvString.azimuthDegrees),
      lossPercent: roundForCache(pvString.lossPercent)
    }))
  });
}

function roundForCache(value) {
  return Math.round(Number(value) * 10000) / 10000;
}
