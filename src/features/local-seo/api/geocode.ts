export interface GeoHit {
  latitude: string;
  longitude: string;
  label: string;
}

// OpenStreetMap's Nominatim allows at most one request per second; results are cached per address.
const cache = new Map<string, Promise<GeoHit | null>>();
let nextSlot = 0;

async function waitTurn() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + 1100;
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

/** Address → coordinates. Only the address text is sent; photos never leave the device. */
export function geocode(address: string): Promise<GeoHit | null> {
  const q = address.trim();
  if (!q) return Promise.resolve(null);
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const job = (async () => {
    await waitTurn();
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error(`Address lookup failed (${res.status})`);
    const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!rows.length) return null;
    return {
      latitude: parseFloat(rows[0].lat).toFixed(6),
      longitude: parseFloat(rows[0].lon).toFixed(6),
      label: rows[0].display_name,
    };
  })();
  cache.set(key, job);
  job.catch(() => cache.delete(key));
  return job;
}
