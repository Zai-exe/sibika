// Checks data/listings.json before it can go live. Run: node scripts/validate.mjs
import { readFileSync } from "node:fs";

const SECTORS = new Set(["disaster","social","govservices","travel","health","education","business","taxes","labor","law","elections","transparency","agri","infra","safety"]);
const TYPES = new Set(["project", "cso"]);
const STATUSES = new Set(["active", "dormant", "unknown"]);
const KEYS = new Set(["id","name","type","maker","org","area","description","sectors","website","region","status","verifiedAt","source","order"]);

const rows = JSON.parse(readFileSync(new URL("../data/listings.json", import.meta.url), "utf8"));
const errors = [];
const ids = new Set();
if (!Array.isArray(rows)) errors.push("listings.json must be an array");

(Array.isArray(rows) ? rows : []).forEach((r, i) => {
  const at = `entry ${i} (${r && r.id || "no id"})`;
  if (!r || typeof r !== "object") return errors.push(`${at}: not an object`);
  for (const k of Object.keys(r)) if (!KEYS.has(k)) errors.push(`${at}: unknown field "${k}"`);
  if (typeof r.id !== "string" || !/^[a-z0-9-]+$/.test(r.id)) errors.push(`${at}: id must be lowercase letters, digits and hyphens`);
  else if (ids.has(r.id)) errors.push(`${at}: duplicate id`); else ids.add(r.id);
  if (typeof r.name !== "string" || !r.name.trim() || r.name.length > 120) errors.push(`${at}: name is required (max 120 characters)`);
  if (!TYPES.has(r.type)) errors.push(`${at}: type must be project or cso`);
  if (typeof r.description !== "string" || r.description.length < 10 || r.description.length > 500) errors.push(`${at}: description must be 10–500 characters`);
  if (!Array.isArray(r.sectors) || !r.sectors.length || r.sectors.some(s => !SECTORS.has(s))) errors.push(`${at}: sectors must be a non-empty list of known sector ids`);
  if (!STATUSES.has(r.status)) errors.push(`${at}: status must be active, dormant or unknown`);
  if (r.verifiedAt !== null && !(typeof r.verifiedAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.verifiedAt))) errors.push(`${at}: verifiedAt must be YYYY-MM-DD or null`);
  if (r.website !== undefined) {
    try { const u = new URL(r.website); if (u.protocol !== "https:" && u.protocol !== "http:") throw 0; }
    catch { errors.push(`${at}: website must be a full http(s) link`); }
  }
  for (const k of ["org", "area", "region", "source", "maker"]) if (r[k] !== undefined && (typeof r[k] !== "string" || r[k].length > 200)) errors.push(`${at}: ${k} must be text under 200 characters`);
});

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: ${rows.length} listings`);
