// Turns a geoBoundaries PHL ADM1 GeoJSON into data/ph-regions.json: one simplified SVG path per region.
// Source: geoBoundaries gbOpen PHL ADM1 (NAMRIA, PSA, OCHA Philippines), CC BY 3.0 IGO.
// Run: node scripts/build-map.mjs path/to/geoBoundaries-PHL-ADM1_simplified.geojson
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
if (!SRC) { console.error("Pass the path to the ADM1 GeoJSON."); process.exit(1); }
const geo = JSON.parse(readFileSync(SRC, "utf8"));

// Our region codes, display names and island group, keyed by the source's ISO code
const REGIONS = {
  "PH-00": ["NCR", "Metro Manila (NCR)", "Luzon"],
  "PH-15": ["CAR", "Cordillera (CAR)", "Luzon"],
  "PH-01": ["R1", "Ilocos Region", "Luzon"],
  "PH-02": ["R2", "Cagayan Valley", "Luzon"],
  "PH-03": ["R3", "Central Luzon", "Luzon"],
  "PH-40": ["R4A", "Calabarzon", "Luzon"],
  "PH-41": ["R4B", "Mimaropa", "Luzon"],
  "PH-05": ["R5", "Bicol Region", "Luzon"],
  "PH-06": ["R6", "Western Visayas", "Visayas"],
  "PH-07": ["R7", "Central Visayas", "Visayas"],
  "PH-08": ["R8", "Eastern Visayas", "Visayas"],
  "PH-09": ["R9", "Zamboanga Peninsula", "Mindanao"],
  "PH-10": ["R10", "Northern Mindanao", "Mindanao"],
  "PH-11": ["R11", "Davao Region", "Mindanao"],
  "PH-12": ["R12", "Soccsksargen", "Mindanao"],
  "PH-13": ["R13", "Caraga", "Mindanao"],
  "PH-14": ["BARMM", "Bangsamoro (BARMM)", "Mindanao"],
};

// Equirectangular projection scaled for ~12°N, 600 units wide
const LON0 = 116.8, LON1 = 126.8, LAT1 = 21.2, LAT0 = 4.4;
const K = 600 / ((LON1 - LON0) * Math.cos(12 * Math.PI / 180));
const W = 600, H = Math.round((LAT1 - LAT0) * K);
const proj = ([lon, lat]) => [(lon - LON0) * Math.cos(12 * Math.PI / 180) * K, (LAT1 - lat) * K];

// Douglas-Peucker simplification. A closed ring starts and ends on the same point, which breaks the
// line test, so split it at the point farthest from the start and simplify the two halves.
function simplify(ring, tol) {
  const pts = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
  if (pts.length < 4) return pts;
  let far = 0, fd = -1;
  pts.forEach(([x, y], i) => { const d = Math.hypot(x - pts[0][0], y - pts[0][1]); if (d > fd) { fd = d; far = i; } });
  const a = simplifyOpen(pts.slice(0, far + 1), tol), b = simplifyOpen(pts.slice(far).concat([pts[0]]), tol);
  return a.concat(b.slice(1, -1));
}
function simplifyOpen(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let idx = -1, max = 0;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = pts => Math.abs(pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0) / 2);
const r1 = n => Math.round(n * 10) / 10;

const out = [];
for (const f of geo.features) {
  const meta = REGIONS[f.properties.shapeISO];
  if (!meta) { console.error("Unknown region", f.properties); process.exit(1); }
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = "", cx = 0, cy = 0, total = 0;
  for (const poly of polys) {
    const ring = simplify(poly[0].map(proj), 0.6);
    const a = area(ring);
    if (a < 0.8 || ring.length < 3) continue; // drop specks too small to see or click
    d += "M" + ring.map(([x, y]) => `${r1(x)},${r1(y)}`).join("L") + "Z";
    const [sx, sy] = ring.reduce(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0]);
    cx += (sx / ring.length) * a; cy += (sy / ring.length) * a; total += a;
  }
  out.push({ code: meta[0], name: meta[1], group: meta[2], cx: r1(cx / total), cy: r1(cy / total), d });
}
const order = Object.values(REGIONS).map(r => r[0]);
out.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));

const json = JSON.stringify({
  source: "geoBoundaries gbOpen PHL ADM1 (NAMRIA, PSA, OCHA Philippines), CC BY 3.0 IGO. Simplified for display.",
  viewBox: `0 0 ${W} ${H}`, regions: out,
});
writeFileSync(new URL("../data/ph-regions.json", import.meta.url), json + "\n");
console.log(`wrote data/ph-regions.json: ${out.length} regions, ${(json.length / 1024).toFixed(0)} KB, viewBox 0 0 ${W} ${H}`);
