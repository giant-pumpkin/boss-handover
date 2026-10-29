# Daily operations: from "Installed" to a synced job

What I actually do every day to keep the job → inventory → subscription chain moving. Walked through with Sky on 2026-10-27 (Handover Part 1). The automations are in [subscription-lifecycle.md](subscription-lifecycle.md); this page is the human side.

## 1. Quote Staging (a few minutes a day, often nothing)

Interface: Jobs base › **Quote-to-job** page (custom element `quote-staging-extension.tsx`). Stages: Needs Customer → Needs Allocation → Ready → Done → Exempt.

- **Needs Customer**: map the HubSpot company to an Airtable customer (e.g. Evolution Wellness Malaysia). The customer lookup matches by **name**.
- **Needs Allocation**: set how many jobs the quote needs. **Ready**: create the jobs in the grid or link existing ones. A quote moves to **Done** by itself once the number of linked jobs equals the allocation.
- **Exempt** is for anything that is not deployment work: software-only renewals and screen-replacement (support) quotes. HubSpot has no custom quote field that says "deployment" vs "support", so this is judged by eye. ConnectIQ is supposed to add that field; until then, Exempt is the escape hatch for anything that does not fit.
- Lugtan (head of operations / deployment) processes accepted quotes almost immediately, so the queue is normally empty. If something sits in Needs Customer for days, ask her.

## 2. Scheduling and dispatch (deployment team, not me)

- New jobs appear on **Deployment (List)** / **Deployment (Calendar)**. A job with a `Date - Scheduled` shows as *Scheduled*, without one as *Tentative*.
- Deployment assigns a partner (installer) on the job. Partners see only their own jobs through the **Jobs X** pages, see [installation-partners.md](installation-partners.md).
- The installer opens the job from the dispatch list and clicks **Start job**, which opens the Fillout form with the job's record ID in the URL ([05-third-party-services/fillout.md](../05-third-party-services/fillout.md)). Serials, photos, videos and incident notes land on the Airtable job, not in Fillout.

## 3. Job statuses, in plain words

| Status | Means |
| --- | --- |
| Tentative | job exists, no date yet |
| Scheduled | date set, partner assigned |
| **Installed** | field work finished: hardware delivered and installed, serials and photos uploaded. **Paperwork still open** (job report, delivery note). The name is misleading for delivery-only jobs. |
| Done | closed, paperwork complete |

Job reports are normally created automatically; a few jobs need a report created by hand. Delivery notes: see [05-third-party-services/docsautomator.md](../05-third-party-services/docsautomator.md) for the manual-signature and e-signature flows, template headers and the Zus Coffee condition bug.

## 4. The unsynced-jobs routine (mine, daily)

The one duty that must get a new owner. The automation chain only starts when a human ticks `sync` (`fldhTpGWsywbFFSU7`).

1. Open **Jobs › Deployment (Calendar)** and use the **Unsynced** tab, or filter the Jobs table by: status is `Done` or `Installed` **and** `sync` unticked **and** job type is `Installation` or `Delivery`. (Support / MA jobs never sync.)
2. Open each job and run **Check inventory availability** (the button that fills `Inventory - Availability`, `fld4nXGpbFqrNnI9r`). Every serial pasted into `Close job - SN` is checked against the Inventory base. An **exclamation mark** next to a serial means that unit is **not in Inventory yet**, and the sync would silently do nothing for it.
3. For each missing serial, **import it into Inventory** first (the *Import inventory* step on the same interface). Since Moss (warehouse) left there are no regular inventory intakes, so you have to work out the product yourself: screens of the same model share a serial **prefix** (e.g. a prefix seen on known 37-inch units means the same product), so copy the product from another unit with the same prefix. This is the "detective work" that makes the routine slow.
4. Wait for the two bases to sync. Inventory and Jobs are separate bases joined by a synced table, and Airtable's cross-base sync is slow and conditional. To hurry it: duplicate the tab, **View data**, open the hidden synced inventory table in the Jobs base and press **Sync now**. Sometimes it syncs, sometimes it does not; check the record count matches the Inventory base before continuing.
5. Re-run the availability check until there are no exclamation marks.
6. Check the contract requirement: installation jobs whose BOM lines carry displays or LISA boxes need a **Subscription contract** on the BOM resource. **Delivery-only jobs need no contract** (Zus Coffee is delivery only: we ship the screen and items, Titanium installs).
7. Tick **`sync`**. Webhook `wflsW0LoP8zU6XBzv` sends the serials, job type, scheduled date and location to the Inventory base, where the matching automation updates each unit's status and location and, for installations, creates the subscription. The job disappears from the Unsynced tab.

### Known blocker pattern

A job cannot be synced while its contract is missing. Example on 2026-10-27: **Boost Juice Lot 1 (Singapore)**, installation finished, contract not entered by the deployment team (Mild). Chase the team to enter the contract on the BOM line, then sync. This recurs; the team does not see the contract as their job.

## 5. Other recurring duties

See [HANDOFF-CHECKLIST.md](../HANDOFF-CHECKLIST.md): yearly MA cycles, monthly subscription report, droplet checks.
