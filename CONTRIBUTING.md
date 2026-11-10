# Contributing

Thanks for helping map civic work in the Philippines.

## Roles

- **Researchers** find projects and CSOs in a sector and submit them.
- **Verifiers** check that existing entries still exist, then set `verifiedAt` to the date they checked.
- **Moderators** review `listing` issues, add approved entries to `data/listings.json`, and close the issue.
- **Developers and designers** improve `index.html`.

## What gets listed

- **Civic tech:** tools, apps, data portals or bots that help citizens use, watch or improve public services.
- **CSOs:** non-government, non-profit groups working on a public issue in the Philippines.
- It must be findable: a site, repository, page or registration.
- Dormant projects stay listed with `"status": "dormant"`.

## Listing fields (`data/listings.json`)

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | Unique, lowercase, hyphens only, e.g. `project-noah` |
| `name` | yes | Display name |
| `type` | yes | `project` (civic tech) or `cso` |
| `description` | yes | One or two sentences |
| `sectors` | yes | One or more of: `disaster`, `social`, `govservices`, `travel`, `health`, `education`, `business`, `taxes`, `labor`, `law`, `elections`, `transparency`, `agri`, `infra`, `safety` |
| `status` | yes | `active`, `dormant` or `unknown` |
| `verifiedAt` | yes | `YYYY-MM-DD` when someone last confirmed it, or `null` |
| `org` | no | Who runs it |
| `website` | no | Full `https://` link |
| `region` | no | Coverage as text: `Nationwide`, an island group (`Luzon`, `Visayas`, `Mindanao`) or a region name. Left out means nationwide. |
| `areas` | no | Region codes the listing serves, for the map: `NCR`, `CAR`, `R1`–`R3`, `R4A` (Calabarzon), `R4B` (Mimaropa), `R5`–`R13`, `BARMM`. Overrides `region` for the map. |
| `maker` | no | `bettergov` for BetterGov creations |
| `area` | no | The maker's own category label |
| `order` | no | Sort order within a maker's group |
| `source` | no | Where the entry came from |

## Moderating a `listing` issue

1. Open the link and check the details are accurate.
2. Copy the JSON from the issue's "Entry for data/listings.json" section into `data/listings.json`, add an `id`, and set `verifiedAt` to today.
3. Commit with `Closes #<issue number>` in the message so the issue closes itself.
