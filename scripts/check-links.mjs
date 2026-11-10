// Visits every listed website and reports the ones that don't answer.
// Run: node scripts/check-links.mjs  (writes broken-links.md when something is down; exits 0 either way)
import { readFileSync, writeFileSync } from "node:fs";

const rows = JSON.parse(readFileSync(new URL("../data/listings.json", import.meta.url), "utf8"));
const targets = rows.filter(r => typeof r.website === "string" && /^https?:\/\//.test(r.website));

async function check(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method, redirect: "follow", signal: AbortSignal.timeout(20000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; SibikaLinkChecker/1.0; +https://github.com/Zai-exe/sibika)" },
      });
      if (res.ok) return { ok: true };
      // Some sites refuse HEAD or bots; only GET failures count.
      if (method === "GET") return { ok: res.status === 403 || res.status === 429, why: `HTTP ${res.status}` };
    } catch (e) {
      if (method === "GET") return { ok: false, why: e.name === "TimeoutError" ? "timed out" : (e.cause?.code || e.message) };
    }
  }
}

const broken = [];
for (const r of targets) {
  const res = await check(r.website);
  if (!res.ok) broken.push({ ...r, why: res.why });
  console.log(`${res.ok ? "ok  " : "DOWN"} ${r.website}${res.ok ? "" : "  (" + res.why + ")"}`);
}

if (broken.length) {
  const body = [
    `The weekly link check found ${broken.length} listed website(s) that didn't answer.`,
    "A site can be down for a day, so check it by hand before marking a listing dormant.",
    "",
    "| Listing | Website | Problem |",
    "| --- | --- | --- |",
    ...broken.map(b => `| ${b.name} (\`${b.id}\`) | ${b.website} | ${b.why} |`),
  ].join("\n");
  writeFileSync("broken-links.md", body + "\n");
}
console.log(`Checked ${targets.length} links, ${broken.length} down.`);
