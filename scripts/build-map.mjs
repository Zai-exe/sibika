// Builds the map files from geoBoundaries gbOpen PHL (NAMRIA, PSA, OCHA Philippines), CC BY 3.0 IGO:
//   data/ph-map.json     region and province outlines as simplified SVG paths
//   data/ph-places.json  every city and municipality with its province, region and map position (for search)
// Run: node scripts/build-map.mjs <ADM1.geojson> <ADM2.geojson> <ADM3.geojson>   (the *_simplified.geojson files)
import { readFileSync, writeFileSync } from "node:fs";

const [A1, A2, A3] = process.argv.slice(2);
if (!A3) { console.error("Pass the ADM1, ADM2 and ADM3 GeoJSON paths."); process.exit(1); }
const load = p => JSON.parse(readFileSync(p, "utf8")).features;

const REGIONS = {
  "PH-00": ["NCR", "Metro Manila (NCR)", "Luzon"], "PH-15": ["CAR", "Cordillera (CAR)", "Luzon"],
  "PH-01": ["R1", "Ilocos Region", "Luzon"], "PH-02": ["R2", "Cagayan Valley", "Luzon"], "PH-03": ["R3", "Central Luzon", "Luzon"],
  "PH-40": ["R4A", "Calabarzon", "Luzon"], "PH-41": ["R4B", "Mimaropa", "Luzon"], "PH-05": ["R5", "Bicol Region", "Luzon"],
  "PH-06": ["R6", "Western Visayas", "Visayas"], "PH-07": ["R7", "Central Visayas", "Visayas"], "PH-08": ["R8", "Eastern Visayas", "Visayas"],
  "PH-09": ["R9", "Zamboanga Peninsula", "Mindanao"], "PH-10": ["R10", "Northern Mindanao", "Mindanao"], "PH-11": ["R11", "Davao Region", "Mindanao"],
  "PH-12": ["R12", "Soccsksargen", "Mindanao"], "PH-13": ["R13", "Caraga", "Mindanao"], "PH-14": ["BARMM", "Bangsamoro (BARMM)", "Mindanao"],
};

// Equirectangular projection for ~12°N, 600 units wide
const COS = Math.cos(12 * Math.PI / 180), LON0 = 116.8, LON1 = 126.8, LAT1 = 21.2, LAT0 = 4.4;
const K = 600 / ((LON1 - LON0) * COS), W = 600, H = Math.round((LAT1 - LAT0) * K);
const proj = ([lon, lat]) => [(lon - LON0) * COS * K, (LAT1 - lat) * K];
const r1 = n => Math.round(n * 10) / 10;

// Douglas-Peucker; closed rings are split at the point farthest from the start
function simplifyOpen(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let idx = -1, max = 0;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len; if (d > max) { max = d; idx = i; } }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function simplify(ring, tol) {
  const pts = ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
  if (pts.length < 4) return pts;
  let far = 0, fd = -1;
  pts.forEach(([x, y], i) => { const d = Math.hypot(x - pts[0][0], y - pts[0][1]); if (d > fd) { fd = d; far = i; } });
  return simplifyOpen(pts.slice(0, far + 1), tol).concat(simplifyOpen(pts.slice(far).concat([pts[0]]), tol).slice(1, -1));
}
const area = pts => Math.abs(pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0) / 2);
const polysOf = g => g.type === "Polygon" ? [g.coordinates] : g.coordinates;

function shape(geometry, tol, minArea) {
  let d = "", cx = 0, cy = 0, total = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of polysOf(geometry)) {
    const ring = simplify(poly[0].map(proj), tol), a = area(ring);
    if (a < minArea || ring.length < 3) continue;
    d += "M" + ring.map(([x, y]) => `${r1(x)},${r1(y)}`).join("L") + "Z";
    for (const [x, y] of ring) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const [sx, sy] = ring.reduce(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0]);
    cx += (sx / ring.length) * a; cy += (sy / ring.length) * a; total += a;
  }
  return { d, cx: r1(cx / total), cy: r1(cy / total), bbox: [r1(x0), r1(y0), r1(x1), r1(y1)] };
}

// Point-in-polygon on lon/lat, used to work out which province and region each place sits in
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inGeom = (pt, g) => polysOf(g).some(poly => inRing(pt, poly[0]) && !poly.slice(1).some(h => inRing(pt, h)));
// A point inside the shape: centroid of its biggest ring, or failing that a vertex-midpoint scan
function innerPoint(g) {
  let best = null, ba = -1;
  for (const poly of polysOf(g)) { const a = area(poly[0]); if (a > ba) { ba = a; best = poly[0]; } }
  const c = best.reduce(([sx, sy], [x, y]) => [sx + x / best.length, sy + y / best.length], [0, 0]);
  if (inGeom(c, g)) return c;
  for (let i = 0; i < best.length; i += Math.max(1, Math.floor(best.length / 50))) {
    const j = (i + Math.floor(best.length / 2)) % best.length, m = [(best[i][0] + best[j][0]) / 2, (best[i][1] + best[j][1]) / 2];
    if (inGeom(m, g)) return m;
  }
  return c;
}
function nearest(pt, items) { // fallback for coastal points that land just outside every shape
  let best = null, bd = Infinity;
  for (const it of items) { const d = Math.hypot(pt[0] - it.ll[0], pt[1] - it.ll[1]); if (d < bd) { bd = d; best = it; } }
  return best;
}

// Regions
const adm1 = load(A1).map(f => {
  const m = REGIONS[f.properties.shapeISO];
  if (!m) { console.error("Unknown region", f.properties); process.exit(1); }
  return { f, code: m[0], name: m[1], group: m[2], ll: innerPoint(f.geometry) };
});
const order = Object.values(REGIONS).map(r => r[0]);
const regions = adm1.map(r => ({ code: r.code, name: r.name, group: r.group, ...shape(r.f.geometry, 0.3, 0.3) }))
  .sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));

// Provinces, each assigned to the region that contains it
const adm2 = load(A2).map(f => {
  const ll = innerPoint(f.geometry);
  const reg = adm1.find(r => inGeom(ll, r.f.geometry)) || nearest(ll, adm1);
  return { f, name: f.properties.shapeName, region: reg.code, ll };
}).sort((a, b) => a.name.localeCompare(b.name));
const provinces = adm2.map(p => ({ name: p.name, region: p.region, ...shape(p.f.geometry, 0.4, 0.12) }));

// Cities and municipalities: name, province index, map position
const places = load(A3).map(f => {
  const ll = innerPoint(f.geometry);
  const pi = adm2.findIndex(p => inGeom(ll, p.f.geometry));
  const prov = pi >= 0 ? pi : adm2.indexOf(nearest(ll, adm2));
  const [x, y] = proj(ll);
  return [f.properties.shapeName, prov, r1(x), r1(y)];
}).sort((a, b) => a[0].localeCompare(b[0]));

const SOURCE = "geoBoundaries gbOpen PHL ADM1-ADM3 (NAMRIA, PSA, OCHA Philippines), CC BY 3.0 IGO. Simplified for display.";
const map = JSON.stringify({ source: SOURCE, viewBox: `0 0 ${W} ${H}`, regions, provinces });
const idx = JSON.stringify({ source: SOURCE, provinces: provinces.map(p => [p.name, p.region]), places });
writeFileSync(new URL("../data/ph-map.json", import.meta.url), map + "\n");
writeFileSync(new URL("../data/ph-places.json", import.meta.url), idx + "\n");
const perRegion = Object.fromEntries(order.map(c => [c, provinces.filter(p => p.region === c).length]));
console.log(`ph-map.json ${(map.length / 1024).toFixed(0)} KB (${regions.length} regions, ${provinces.length} provinces); ph-places.json ${(idx.length / 1024).toFixed(0)} KB (${places.length} places)`);
console.log("provinces per region:", JSON.stringify(perRegion));
