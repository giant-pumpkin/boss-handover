# Hosting the team dashboards on the TargetR video wall

Observed read-only in the TargetR console on 2026-10-30. Console: https://signage.giant-pumpkin.com (TargetR; login via Sky's account, the admin session was masquerading as Sky).

## The two screens

| Screen (TargetR label) | Sequence it plays | Player software | Position |
| --- | --- | --- | --- |
| `ExpC - 1x1L(2) (Dashboard Left)` | **Dashboard left** | `android-player-2025-11-10.apk` | video wall, Experience Center office, left |
| `ExpC - 1x1L(3) (Dashboard Right)` | **Dashboard Right** | `android-exoplayer-12.0.apk` | video wall, right |

Both were Online at inspection. Screens → the row shows which sequence is assigned; the assignment is the only link between a screen and its content.

## How a dashboard gets on screen

Each sequence is a playlist of **slots**; each slot is a **stack** of alternative items, evaluated top-down ("skipped if an item stacked above is valid"). The dashboard is a single **web item** in one slot whose Display tab is set to *Single item* with a *Web address* resource:

| Sequence | Slot | Web address | Duration |
| --- | --- | --- | --- |
| Dashboard Right | 4 | `https://datastudio.google.com/embed/reporting/9d81425a-db1f-473e-8607-abf7215a8a37/page/KH05F?hl=en` | 15 min, loops |
| Dashboard left | 6 | `https://datastudio.google.com/embed/reporting/5b779fd0-4914-4de2-a786-bf348cca998e/page/KH05F?hl=en` | 15 min, loops |

The address is the Looker Studio **embed** URL (`/embed/reporting/<id>/page/<page>`), not the editor URL from [README.md](README.md). The report must be shared so that the embed loads without a Google login, or the player shows a sign-in page. <!-- TODO: confirm the sharing setting: "anyone with the link can view" or domain-wide -->

### `?hl=en` is mandatory

Without `?hl=en` on the embed URL Looker Studio localises to the player's locale: Thai interface strings **and the Buddhist calendar**, so every date shows 2569 instead of 2026. Always append `?hl=en` when creating or replacing a dashboard item. This is the single most common way the wall breaks after a re-publish.

### The other items in each sequence

- Media items (`right.mp4`, `left.mp4`, `group.png`, `group_2.png`, `Apple_ad.mp4`) in slots 1–4 are **expired**: each has an End date on its Campaign tab (greyed thumbnail, orange ⊘ icon), so the player skips them. They are the pre-dashboard content and old stacked alternatives, kept rather than deleted.
- Dashboard left slot 5 is an older web item pointing at a `lookerstudio.google.com/embed/reporting/7e…` report, expired on 2026-07-09. The live one is slot 6 (green dot = active).
- A slot with only expired items is skipped entirely, so the sequence effectively plays the one live web item for 15 minutes and starts again.

## Getting the embed URL from Looker Studio

1. Open the report in Looker Studio (editor links in [README.md](README.md)).
2. **Share ▾ → Embed report**.
3. In the dialog pick **Embed URL** (not Embed Code) and **Copy to clipboard**. "Show report navigation in embedded mode" can stay ticked.
4. The copied value looks like `https://datastudio.google.com/embed/reporting/<report-id>/page/<page-id>`. **Append `?hl=en`** before pasting it into TargetR; the dialog does not add it.

## Changing a dashboard

1. Sequences → search `dash` → Open the sequence.
2. Click the live web item → **Edit** → Display tab → paste the embed URL from the step above, with `?hl=en`.
3. Or add a new item in the next empty slot and **Expire** the old one (item menu → Expire sets the End date to now) rather than deleting it, so it can be restored by clearing the date.
4. Save. Players pick the change up on their next sync; `Screens` shows last contact.

Item menu actions: Edit, Preview, Copy, Expire, Remove. Expire is reversible; Remove is not.

## Other dialog settings seen (all defaults)

General: no label, 15 min 0 s. Condition: empty. Advanced: transition Default, not fullscreen, not "finish early". Campaign: start empty, end set only on expired items, browser time zone GMT+7.

## Other sequences on the account

The same console serves production signage for customers (Virgin Active Doha, Dusit Thani College, …) and the other Experience Center screens (`ExpC - Default`, lifts). Nothing in this page applies to those; **do not edit anything outside the two Dashboard sequences.**
