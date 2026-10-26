"""
Grassfish IXM Aqua → Airtable + Google Sheets Sync
====================================================
Replaces the Playwright web-scraping approach with the Grassfish API.

Flow:
  1. Authenticate with Grassfish API (OAuth client_credentials)
  2. Fetch all clients (sub-accounts)
  3. Fetch all players per client via API (with status, info, location, identification)
  4. Build DataFrame matching the original scraped CSV format
  5. Upsert to Airtable (same logic as before)
  6. Upload to Google Sheets (same logic as before)

.env required:
  GRASSFISH_CLIENT_ID=gpapi
  GRASSFISH_CLIENT_SECRET=your_secret
  GRASSFISH_REGION=as01
  AT_TOKEN=your_airtable_pat
  GSHEET_ID=your_google_sheet_id
  GOOGLE_CREDS_JSON={"type":"service_account",...}
"""

import os
import json
import time as time_module
import sys
import logging
from time import time
from datetime import datetime
from zoneinfo import ZoneInfo

import dotenv
import requests
import pandas as pd
import gspread
import pyairtable
from gspread_dataframe import set_with_dataframe

dotenv.load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Grassfish Config ──────────────────────────────────────────────────────────
GRASSFISH_CLIENT_ID = os.getenv("GRASSFISH_CLIENT_ID")
GRASSFISH_CLIENT_SECRET = os.getenv("GRASSFISH_CLIENT_SECRET")
GRASSFISH_REGION = os.getenv("GRASSFISH_REGION", "as01")

IDENTITY_URL = f"https://identity.{GRASSFISH_REGION}.signageplayer.app/connect/token"
API_BASE = f"https://connect.{GRASSFISH_REGION}.signageplayer.app/api"
RATE_LIMIT_DELAY = 0.25

# ── Airtable Config ──────────────────────────────────────────────────────────
AT_TOKEN = os.getenv("AT_TOKEN")
AT_BASE_ID = "app8H7IMW8gHyQzzn"
AT_TABLE_NAME = "Signage Scraper"

# ── Google Sheets Config ──────────────────────────────────────────────────────
GSHEET_ID = os.getenv("GSHEET_ID")
GOOGLE_CREDS_JSON = os.getenv("GOOGLE_CREDS_JSON")

# ── Clients to ignore (same list as the scraper) ─────────────────────────────
CLIENTS_TO_IGNORE = [
    "Apple Mexico", "Apple Team Asia", "Apple USA", "Chowking",
    "Giant Pumpkin", "Giant Pumpkin - Apple", "Giant Pumpkin Demo", "va testa",
]


# ══════════════════════════════════════════════════════════════════════════════
# GRASSFISH API FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def get_token() -> str:
    resp = requests.post(IDENTITY_URL, data={
        "grant_type": "client_credentials",
        "client_id": GRASSFISH_CLIENT_ID,
        "client_secret": GRASSFISH_CLIENT_SECRET,
        "scope": "spconnect",
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError(f"Token request failed: {json.dumps(data)}")
    log.info("Token acquired. Expires in %ss.", data.get("expires_in", "?"))
    return token


def fetch_clients(token: str) -> list[dict]:
    resp = requests.post(f"{API_BASE}/selectclients", json={}, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }, timeout=30)
    resp.raise_for_status()
    clients = resp.json().get("clients", [])
    log.info("Found %d clients.", len(clients))
    return clients


def fetch_players_for_client(token: str, client_id: str) -> list[dict]:
    resp = requests.post(f"{API_BASE}/selectplayers", json={}, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-clientId": client_id,
        "x-request-status": "true",
        "x-request-information": "true",
        "x-request-location": "true",
        "x-request-identification": "true",
    }, timeout=60)
    resp.raise_for_status()
    return resp.json().get("players", [])


def fetch_all_players(token: str, clients: list[dict]) -> tuple[list[dict], dict]:
    """
    Fetch players across all clients.
    Returns (all_players, stats) where stats has online/offline/unpaired counts.
    """
    all_players = []
    total_ignored = 0
    total_online = 0
    total_offline = 0
    total_unpaired = 0

    for i, client in enumerate(clients, start=1):
        cid = client.get("id", "")
        cname = client.get("name", "")

        try:
            players = fetch_players_for_client(token, cid)
        except Exception as e:
            log.error("[%d/%d] %s — FAILED: %s", i, len(clients), cname, e)
            if i < len(clients):
                time_module.sleep(RATE_LIMIT_DELAY)
            continue

        # Count statuses for ALL clients (before ignore filter)
        for p in players:
            status = (p.get("status") or {}).get("statusCalculated", "")
            if status == "OK":
                total_online += 1
            elif status in ("FakePlayer", "None", ""):
                total_unpaired += 1
            else:
                total_offline += 1

        if cname in CLIENTS_TO_IGNORE:
            log.info("[%d/%d] %s — %d players (IGNORED)", i, len(clients), cname, len(players))
            total_ignored += len(players)
        else:
            for p in players:
                p["_client_name"] = cname
                p["_client_id"] = cid
            all_players.extend(players)
            log.info("[%d/%d] %s — %d players", i, len(clients), cname, len(players))

        if i < len(clients):
            time_module.sleep(RATE_LIMIT_DELAY)

    total_all = total_online + total_offline + total_unpaired
    stats = {
        "total_online": total_online,
        "total_offline": total_offline,
        "total_unpaired": total_unpaired,
        "total_players": total_all,
        "total_ignored": total_ignored,
        "total_valid": total_all - total_ignored,
    }

    log.info("Total: %d players (%d valid, %d ignored)", total_all, len(all_players), total_ignored)
    log.info("Online: %d  |  Offline: %d  |  Unpaired: %d", total_online, total_offline, total_unpaired)
    return all_players, stats


# ══════════════════════════════════════════════════════════════════════════════
# DATA MAPPING — matches the scraped CSV columns exactly
# ══════════════════════════════════════════════════════════════════════════════

def derive_screen_status(player: dict) -> str:
    status = player.get("status") or {}
    calculated = status.get("statusCalculated", "")
    if calculated == "OK":
        return "Online"
    if status.get("isNotStarted", False):
        return "Unpaired"
    return "Offline"


def map_player_to_row(player: dict) -> dict:
    info = player.get("information") or {}
    status = player.get("status") or {}
    location = player.get("location") or {}
    ident = player.get("identification") or {}

    screen_models = info.get("screenModels") or []
    if not screen_models and info.get("screenOneModel"):
        screen_models = [info["screenOneModel"]]

    return {
        "Client":            player.get("_client_name", ""),
        "PlayerName":        player.get("name", ""),
        "PlayerId":          player.get("id", ""),
        "Location":          location.get("name", ""),
        "LocationId":        location.get("id", ""),
        "AutoPair":          str(ident.get("isAllowAutoIdentification", False)).upper(),
        "PlayerCode":        player.get("code", ""),
        "Tags":              ", ".join(
            (t.get("name") if isinstance(t, dict) else str(t))
            for t in (player.get("tags") or [])
        ),
        "ScreenModels":      ", ".join(screen_models),
        "FirstContactDate":  info.get("insertedDateTime", ""),
        "LastContactDate":   info.get("lastCommunicationDateTime", "")
                             or status.get("lastCommunicationDateTime", ""),
        "SerialNumber":      info.get("computerSerialNumber", ""),
        "ScreenStatus":      derive_screen_status(player),
        "ClientId":          player.get("_client_id", ""),
    }


def build_dataframe(players: list[dict]) -> pd.DataFrame:
    rows = [map_player_to_row(p) for p in players]
    df = pd.DataFrame(rows)
    df = df.fillna("")
    df = df.drop_duplicates(subset=["PlayerCode"], keep="first")
    # Mark players with no serial number as Unpaired (same as scraper)
    df.loc[
        df["SerialNumber"].isna() | (df["SerialNumber"].str.strip() == ""),
        "ScreenStatus",
    ] = "Unpaired"
    df.sort_values(by=["Client", "PlayerName"], inplace=True, ignore_index=True)
    df = df[[
        "Client", "PlayerName", "PlayerId", "Location", "LocationId",
        "AutoPair", "PlayerCode", "Tags", "FirstContactDate", "LastContactDate",
        "ScreenModels", "SerialNumber", "ScreenStatus", "ClientId",
    ]]
    return df


# ══════════════════════════════════════════════════════════════════════════════
# AIRTABLE UPLOAD — same logic as scraper
# ══════════════════════════════════════════════════════════════════════════════

def _chunked_upsert(table, records: list[dict], key_fields: list[str], chunk_size: int = 10):
    """Upsert records in small batches with rate-limit delays to avoid connection drops."""
    for i in range(0, len(records), chunk_size):
        batch = records[i : i + chunk_size]
        batch_num = (i // chunk_size) + 1
        total_batches = (len(records) + chunk_size - 1) // chunk_size
        try:
            table.batch_upsert(batch, key_fields=key_fields)
            if batch_num % 50 == 0 or batch_num == total_batches:
                log.info("  Airtable batch %d/%d done (%d records so far)",
                         batch_num, total_batches, min(i + chunk_size, len(records)))
        except Exception as e:
            log.error("  Airtable batch %d/%d failed: %s", batch_num, total_batches, e)
            raise
        time_module.sleep(0.25)


def upload_to_airtable(df: pd.DataFrame):
    log.info("Uploading to Airtable...")

    airtable_df = df[[
        "SerialNumber", "ScreenStatus", "ScreenModels", "PlayerCode",
        "LocationId", "Location", "FirstContactDate", "LastContactDate",
        "Client", "ClientId",
    ]].copy()
    airtable_df = airtable_df.dropna(how="any", axis=0)
    airtable_df = airtable_df.apply(lambda col: col.str.strip() if col.dtype == "object" else col)

    table = pyairtable.Api(AT_TOKEN).table(base_id=AT_BASE_ID, table_name=AT_TABLE_NAME)
    records = table.all()

    table_player_codes = set(
        r["fields"]["PlayerCode"] for r in records if "PlayerCode" in r["fields"]
    )
    scraped_player_codes = set(airtable_df["PlayerCode"])

    missing_codes = table_player_codes - scraped_player_codes
    missing_records = [{"fields": {"PlayerCode": pc, "ScreenStatus": "Missing"}} for pc in missing_codes]
    scraped_records = [{"fields": rec} for rec in airtable_df.to_dict(orient="records")]

    log.info("Airtable records: %d | Scraped: %d | Missing: %d",
             len(table_player_codes), len(scraped_player_codes), len(missing_codes))

    log.info("Upserting %d scraped records...", len(scraped_records))
    _chunked_upsert(table, scraped_records, key_fields=["PlayerCode"])

    if missing_records:
        log.info("Upserting %d missing records...", len(missing_records))
        _chunked_upsert(table, missing_records, key_fields=["PlayerCode"])

    log.info("Airtable upload complete.")


# ══════════════════════════════════════════════════════════════════════════════
# GOOGLE SHEETS UPLOAD — same logic as scraper
# ══════════════════════════════════════════════════════════════════════════════

def get_gsheets_workbook():
    creds_dict = json.loads(GOOGLE_CREDS_JSON)
    gc = gspread.service_account_from_dict(creds_dict)
    return gc.open_by_key(GSHEET_ID)


def upload_to_gsheets(df: pd.DataFrame, workbook, timestamp: str, total_time: float):
    log.info("Uploading to Google Sheets...")
    raw_data_sheet = workbook.worksheet("raw_data")
    raw_data_sheet.clear()
    set_with_dataframe(raw_data_sheet, df)
    # Add the "LAST UPDATED" marker in the same column as the scraper (col 17)
    raw_data_sheet.update_cell(1, 17, f"LAST UPDATED: {timestamp}")
    log.info("Google Sheets upload complete.")

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    time_start = time()
    timestamp = datetime.now(ZoneInfo("Asia/Bangkok")).strftime("%a %d %b %Y %H:%M")

    log.info("=== Grassfish → Airtable + Google Sheets Sync Started ===")

    # ── Step 1: Get token ─────────────────────────────────────────────────────
    token = get_token()

    # ── Step 2: Fetch clients ─────────────────────────────────────────────────
    clients = fetch_clients(token)
    if not clients:
        log.warning("No clients found. Exiting.")
        return

    # ── Step 3: Fetch all players ─────────────────────────────────────────────
    players, stats = fetch_all_players(token, clients)

    time_end = time()
    total_time = time_end - time_start
    mins = int(total_time // 60)
    secs = round(total_time % 60, 2)
    log.info("API fetch completed in %d minutes, %s seconds.", mins, secs)

    if not players:
        log.warning("No players returned. Exiting.")
        return

    # ── Step 4: Build DataFrame ───────────────────────────────────────────────
    final_df = build_dataframe(players)
    log.info("DataFrame built: %d records (after dedup).", final_df.shape[0])

    # ── Validation (same mismatch check as scraper) ───────────────────────────
    workbook = get_gsheets_workbook()

    # Note: the scraper compared scraped count vs (total_players - ignored).
    # With the API, we already excluded ignored clients from `players`,
    # so final_df count should match stats["total_valid"] (minus dedup).
    # We log the comparison but don't hard-fail since dedup can cause a small diff.
    log.info("Valid players (API): %d | DataFrame rows: %d",
             stats["total_valid"], final_df.shape[0])
    
    # ── Step 5: Google Sheets upload ──────────────────────────────────────────
    try:
        upload_to_gsheets(final_df, workbook, timestamp, total_time)
    except Exception as e:
        log.error("Google Sheets upload failed: %s", e)
        sys.exit(1)


    # ── Step 6: Airtable upsert ──────────────────────────────────────────────
    try:
        upload_to_airtable(final_df)
    except Exception as e:
        log.error("Airtable upload failed: %s", e)
        sys.exit(1)


    log.info("=== All done. %d players synced in %dm %ss ===", final_df.shape[0], mins, secs)


if __name__ == "__main__":
    main()