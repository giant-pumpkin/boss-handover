# HubSpot API access

Written 2026-10-29 from a live review of the portal's Development area. Portal **Giant Pumpkin**, ID `244131765`, region `na2`. App base URL `https://app-na2.hubspot.com`, API base URL `https://api.hubapi.com`. The general HubSpot page is [hubspot.md](hubspot.md).

## 1. How authentication works here

HubSpot offers three ways to call its API. This portal uses only one of them.

**Private app access tokens (what we use).** A private app is created inside our own portal. It has a fixed list of scopes (what it may read or write) and one long-lived access token.

- Tokens start with `pat-na2-` followed by a UUID. The `na2` is the data-centre region; tokens from other regions will not work against this portal.
- They belong to the portal, not to the person who created them. If that person leaves, the token keeps working.
- They never expire on their own. The only way to invalidate one is to rotate it or delete the app.
- Rotating a token invalidates the old one immediately. Every consumer must be updated at the same moment or it starts failing with HTTP 401.
- They are sent as a bearer header: `Authorization: Bearer pat-na2-…`
- Each private app also has a client secret. It is not used for API calls; it only verifies the signature on webhook deliveries from that app.

**OAuth public apps (not used).** The "developer platform", "Projects" and "app management" screens are for apps distributed to other HubSpot customers via the marketplace. They use a client ID, client secret, short-lived access tokens and refresh tokens. We have none. Ignore those screens unless we decide to migrate (see §6).

**Legacy API keys (gone).** The old `hapikey=` query-string key was shut off in 2022. Any script or doc that mentions it is stale.

## 2. Where to find the apps in the HubSpot UI

HubSpot moved private apps in 2026. The old page at Settings › Integrations › Private Apps now shows "Your private apps have moved". The current location is **Development (left sidebar, code icon) › Legacy Apps**, direct link `https://app-na2.hubspot.com/legacy-apps/244131765`.

Each app has four tabs:

- **Overview**: 7-day call volume and recent error counts.
- **Auth**: the access token (masked, with Show / Copy / Rotate), the client secret, and the scope list. Scopes are edited via Edit app at top right.
- **Logs**: every API call made with this token, filterable by method, response code, URL and date, with request and response bodies. Export to CSV is available. This is the first place to look when an integration misbehaves.
- **Webhooks**: target URL and event subscriptions, if the app has any.

The "Update available" badge on every app is HubSpot asking us to migrate to the new developer platform. It does not mean anything is broken.

## 3. Inventory of private apps

HubSpot shows the first five characters of each token unmasked. Use that prefix to match a token stored in n8n, `.env` files or a secrets manager back to its app without revealing the full secret.

| App | Token prefix | Last changed | Consumer | API sunset warning |
| --- | --- | --- | --- | --- |
| **API - Quote line items** | `pat-na2-a9f03` | 2026-07-16 | the HubSpot → Airtable quote sync ([03-data-pipelines/hubspot-to-airtable](../03-data-pipelines/hubspot-to-airtable/), env var `HS_TOKEN`, confirmed by prefix). Check the n8n HubSpot credentials for the same prefix. ~20,000 calls/day | Mar + Sep 2027 |
| Lovable-Forecast | `pat-na2-71470` | 2026-02-17 | the forecast app built with Lovable | Mar + Sep 2027 |
| Sales Dashboard | `pat-na2-b32cd` | 2026-02-03 | the sales dashboard | Sep 2027 |
| GP-Webhooks | `pat-na2-36742` | 2025-11-11 | nothing real: webhooks post to webhook.site (§5.2) | — |

Scopes:

- **API - Quote line items**: `crm.objects.quotes.read/write`, `crm.schemas.quotes.read/write`, `crm.objects.line_items.read`, `crm.schemas.line_items.read`, `crm.objects.deals.read`, `crm.schemas.deals.read`, `crm.objects.companies.read`, `crm.schemas.companies.read`, `crm.objects.contacts.read`, `crm.schemas.contacts.read`, `crm.objects.products.read/write`, `crm.objects.owners.read`. Known problem: §5.1.
- **Lovable-Forecast**: read only on quotes, line items, deals, companies, products, orders pipeline, plus the matching schema reads.
- **Sales Dashboard**: read on deals, contacts, quotes and their schemas; also `crm.objects.contacts.sensitive.read`, `crm.objects.contacts.highly_sensitive.read`, `crm.objects.deals.sensitive.read`, `crm.objects.deals.highly_sensitive.read`, `sales-email-read`. **This is the widest-access token in the portal.** It can read sensitive and highly sensitive property values and sales emails. Treat it as the most important one to keep out of source control and to rotate if there is any doubt about exposure.
- **GP-Webhooks**: read on quotes, subscriptions, companies and their schemas. Webhooks: active subscriptions on Subscription (3 of 3 event types) and Company (3 of 3 event types), throttled to 10 requests.

## 4. How the quote sync uses the API

The Airtable Jobs base has a table `HS - Quotes` (`tblRSXCmjroNPaO5j`) that mirrors HubSpot quotes; the Quote Staging interface extension reads it to build its queue. Relevant HubSpot objects and properties:

- Quotes (`/crm/objects/v3/quotes`): listed in pages, then fetched with their associated line items via `/crm/objects/v4/quotes/{id}/associations/line_items` and `/crm/objects/v3/line_items/batch/read`.
- Deals, contacts, companies: fetched in batches (`/crm/objects/v3/{object}/batch/read`) to fill deal name, company name and contact details on the Airtable row.
- Custom quote property `quote_service`: single-value, with values such as `music_streaming` and `digital_signage`. Maps to the Airtable field `Quote Service (HS)`. The sync attempts to write this property back to HubSpot quotes; see §5.1 for why that fails.
- `HS - Quotes - LI` (line items) in Airtable is legacy and not used by the Quote Staging extension.

Request pattern seen in the logs, per sync run: `GET /crm/objects/v3/quotes` (paged), then per quote `GET …/associations/line_items`, `POST …/line_items/batch/read`, `PATCH /crm/objects/v3/quotes/{id}`, plus batched `deals` and `contacts` reads.

## 5. Known problems as of 2026-10-29

### 5.1 Thousands of failing PATCH calls on published quotes

The quotes app logs roughly 9,700 HTTP 400 responses per week, plus a handful of 5xx. Every 400 is the same call:

```
PATCH /crm/objects/v3/quotes/{quoteId}
{"properties":{"quote_service":"music_streaming"}}
```

HubSpot responds:

```
Validation Error: Published Quote cannot be edited.  (subCategory: LOCKED)
```

Once a quote is published, HubSpot locks it; no property can be changed via the API. The sync retries this on every run for every published quote, so it will never succeed. It wastes about half of the app's daily API budget and makes the Overview chart useless for spotting real errors.

Which sync sends it: two syncs share this token ([open item](../09-open-items/README.md)). The Python `main.py` skips `ARCHIVED`, `EXPIRED` and `VOID` quotes but not published ones, and writes through `POST /crm/v3/objects/quotes/batch/update`, falling back to one-record batches. The per-record `PATCH …/quotes/{id}` shape in the logs matches the in-Airtable automation `Sync HS Quotes` (`wflmPH9mROs9nyH4M`) better. Check the Logs tab's request bodies before fixing either.

Fix options, in order of preference:

1. Only PATCH quotes whose `hs_status` is `DRAFT`, and skip the rest.
2. Stop writing `quote_service` back to HubSpot at all if Airtable is the only consumer of it.
3. If the value must live in HubSpot, set it before publishing, which means in the sales process rather than in the sync.

### 5.2 GP-Webhooks posts to a public inspection URL

The webhook target on GP-Webhooks is `https://webhook.site/6d210572-3262-4e13-990c-1b8993686ff0`. webhook.site is a public request-capture service meant for testing. Anyone who has that URL can read every payload delivered to it, and the service keeps them. The subscriptions are active, so every Subscription and Company create, update and delete event in HubSpot is being posted there now.

This looks like a test endpoint that was never switched to the real n8n webhook. Action: either point the target at the correct n8n webhook URL, or pause the two subscriptions until there is a real consumer. Then consider rotating this app's client secret, since the signature secret may have been shared with whoever set up the test.

### 5.3 API version sunset

Three of the four apps show "In the last 90 days, this app called HubSpot API versions that won't be supported after March 2027 or September 2027." HubSpot's "Review migration details" link on each app lists the exact endpoints. Budget time before March 2027 to move the sync and the two dashboards onto the current versions. In practice this usually means `v3` → `v4` for associations and the newer CRM object endpoints. ConnectIQ M8 may retire the sync first; see [06-connectiq](../06-connectiq/).

## 6. Operating procedures

**Rotating a token**

1. List every place the token is stored: n8n credentials, `.env` files on the droplet, the Lovable project settings, dashboard config, any CI secrets.
2. In HubSpot, open the app › Auth › Rotate. HubSpot offers "rotate now" (old token dies immediately) or "rotate and expire later" (old token lives up to 7 days). Use the delayed option for anything with multiple consumers.
3. Update every consumer with the new token.
4. Watch the app's Logs tab for 401 responses over the next day; any that appear are a consumer you missed.

**Adding or removing scopes.** Open the app › Edit app › Scopes. Changing scopes does not change the token. Removing a scope that a consumer needs produces HTTP 403 with a `MISSING_SCOPES` error in the Logs tab.

**Creating a new private app.** Development › Legacy Apps › Create legacy app › Private. Name it after the consumer, not the data. Grant only the scopes the consumer needs; do not copy the Sales Dashboard scope list as a template.

**Rate limits.** Private apps share the portal's limits: a burst limit per 10 seconds per app (HubSpot documents 100; the sync script throttles to 150 and has not been rejected), and a daily cap that depends on the HubSpot tier (Settings › Integrations › API usage). HTTP 429 means the burst was exceeded; back off and retry. The quotes app's wasted PATCH calls count against both limits.

**Where the full tokens live.** Never in this repository and never in chat or tickets. The reference form is the app name plus the five-character prefix above. If a full token has been pasted anywhere shared, rotate it.

## 7. Checklist for whoever takes this over

- [ ] Confirm which n8n credential holds which app, by prefix.
- [ ] Locate every copy of `HS_TOKEN` (`a9f03`) outside n8n (droplet `.env`, `~/.secrets`).
- [ ] Fix or remove the published-quote PATCH in the sync (§5.1).
- [ ] Repoint or pause the GP-Webhooks subscriptions (§5.2).
- [ ] Decide whether the Sales Dashboard still needs sensitive and highly sensitive scopes; trim if not.
- [ ] Plan the API version migration before March 2027 (§5.3).
- [ ] Add an owner's name to each app's description field in HubSpot, so the next person does not have to guess.
