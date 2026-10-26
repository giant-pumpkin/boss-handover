import os
import requests, csv, time, base64

API_KEY = os.environ["FRESHDESK_API_KEY"]  # was hard-coded; rotated at handoff
AUTH = base64.b64encode(f"{API_KEY}:X".encode()).decode()
HEADERS = {"Authorization": f"Basic {AUTH}"}
BASE = "https://giantpumpkin-help.freshdesk.com/api/v2"

rows = []
page = 1

while True:
    r = requests.get(
        f"{BASE}/tickets?include=stats&per_page=100&page={page}&order_by=created_at&order_type=asc&updated_since=2024-08-01T00:00:00Z",
        headers=HEADERS
    )
    
    if r.status_code == 429:
        retry = int(r.headers.get("Retry-After", 30))
        print(f"  Rate limited, waiting {retry}s...")
        time.sleep(retry)
        continue
    
    tickets = r.json()
    if not tickets:
        break
    
    for d in tickets:
        s = d.get("stats", {}) or {}
        rows.append([
            f"TIC-FD{d['id']}",
            d.get("created_at", ""),
            s.get("first_responded_at", ""),
            s.get("resolved_at", ""),
            s.get("closed_at", "")
        ])
    
    print(f"Page {page}: {len(tickets)} tickets (total so far: {len(rows)})")
    
    if len(tickets) < 100:
        break
    
    page += 1
    time.sleep(0.5)

with open("ticket_timestamps.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["ID", "created_at", "first_response_at", "resolved_at", "closed_at"])
    writer.writerows(rows)

print(f"\nDone → ticket_timestamps.csv ({len(rows)} tickets)")