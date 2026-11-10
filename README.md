# Sibika Directory

An open directory of civic tech projects and civil society organizations (CSOs) in the Philippines, sorted into 15 sectors.

**Live site:** https://zai-exe.github.io/sibika/

## Sectors

Disaster & Recovery · Social & Welfare · Government Services · Travel · Health · Education · Business & Economy ·
Taxes & Finance · Labor & Employment · Law & Justice · Elections & Governance · Transparency & Procurement ·
Agriculture & Environment · Infrastructure & Transport · Public Safety

## How it works

- `index.html` is the whole site: plain HTML, CSS and JavaScript, with no build step.
- `data/listings.json` holds every listing. The page loads it on open.
- GitHub Pages serves the `main` branch as-is.

## Add or fix a listing

- **No code:** use the **Submit a Listing** form on the site, or open a [New listing issue](https://github.com/Zai-exe/sibika/issues/new?template=new-listing.yml).
- **With code:** edit `data/listings.json` and open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the fields.

## Run it locally

Any static server works, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Status of the data

- **BetterGov creations** come from BetterGov's public projects page and are marked verified as of 10 Nov 2026.
- **Other starter entries** are marked "Needs verification" until a volunteer confirms them.

## License

- **Code:** [MIT](LICENSE)
- **Data** (`data/listings.json`): [CC BY 4.0](data/LICENSE.md). Reuse it freely; credit Sibika Directory.

Not an official government website.
