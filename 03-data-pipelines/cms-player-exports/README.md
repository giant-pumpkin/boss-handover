# cms-player-exports

API probes and exports for the signage CMS platforms. The older `cms-scraper` and `dp-scraper` are abandoned (unreliable) and live in [../deprecated/](../deprecated/).

| Source folder | Does |
| --- | --- |
| `~/coding/ixm-aqua-api` | IXM Aqua / Grassfish API tests; produced `CMS_DP_Information_*.xlsx`, `grassfish_players_*.xlsx` |
| `~/coding/aqua-api-probe` | `probe.py`: read-only by default; `--write` creates `GP-SMOKE-TEST` in the Giant Pumpkin Demo client; never deletes |

## IXM Aqua API facts

- OpenAPI spec (no auth): `https://connect.as01.signageplayer.app/swagger/v1/swagger.json`
- Writes exist (`POST /api/locations/{id}`, `/api/players/{locationId}/{playerId}`, `/api/clients/{id}`; bulk variants), scoped by `x-clientId` header. `id` is caller-chosen; `code` auto-generated.
- Pairing: `macAddress` + `isAllowAutoIdentification: true`, or `playerSecret`.
- **2026-09-25: `gpapi` is read-only** (403 on POST). Its credentials were in the old `cms-scraper/.env`. A write-enabled user would have to be requested from Visual Art; not requested.
- Rule: **never delete in the CMS** from a script.

Two platforms matter and the split matters: CMS Asia vs Signage Player Europe (Starbucks / BFI). See [05-third-party-services/cms-signage.md](../../05-third-party-services/cms-signage.md).
