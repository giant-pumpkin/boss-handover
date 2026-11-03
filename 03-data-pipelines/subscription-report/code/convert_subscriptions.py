"""
convert_subscriptions.py
Step 1 of the subscription report pipeline.

Turns the Airtable "Subscriptions - Generate Report" CSV export into the
column layout that build_report.py expects.

Usage:
    python convert_subscriptions.py <export.csv> <output.xlsx>

Why this exists: build_report.py was written against an older export format.
Rather than rewrite it every time Airtable's column names drift, this step
maps the current export onto the legacy names. Select columns BY NAME, never
by position — the export's column order has changed more than once.
"""
import sys
import pandas as pd

REQUIRED = ['ID', 'Status', 'Subscription contract', 'Resource', 'Duration - FoC',
            'Inventory ID', 'Service Location', 'Start (DD-MMM-YYYY)', 'End (DD-MMM-YYYY)']


def parse_location(loc):
    """'THA - QSA - KFC - Store - 1234' -> brand_owner='QSA', brand='KFC'.
    A 3-part location ('THA - Boost Juice - Store') has brand_owner == brand."""
    if pd.isna(loc) or not str(loc).strip():
        return '', ''
    parts = [p.strip() for p in str(loc).split(' - ')]
    if len(parts) >= 4:
        return parts[1], parts[2]
    if len(parts) == 3:
        return parts[1], parts[1]
    return '', ''


def classify_service(resource):
    """Resource name -> service type. The report is normally run for
    'Digital signage' only."""
    if pd.isna(resource):
        return 'Unknown'
    r = str(resource).lower()
    if any(x in r for x in ['samsung', 'lg', 'giada', 'generic']):
        return 'Digital signage'
    if 'streamit' in r:
        return 'Music streaming'
    if 'royal' in r:
        return 'Royal streaming'
    if 'giant pumpkin' in r:
        return 'Software'
    return 'Other'


def main(src, dst):
    df = pd.read_csv(src, encoding='utf-8-sig')

    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        sys.exit(f"ERROR: export is missing required columns: {missing}\n"
                 f"Re-export from the 'Subscriptions - Generate Report' view.")

    # Legacy column names the report script expects
    df['Start date'] = df['Start (DD-MMM-YYYY)']
    df['End date'] = df['End (DD-MMM-YYYY)']
    df['Location - Installation'] = df['Service Location']
    df['Installation date'] = None
    df['Created'] = None

    # FOC must come from the export. NEVER hardcode this to 0 — it was, once,
    # and every free-of-charge month was silently counted as billable.
    df['Duration - FoC'] = pd.to_numeric(df['Duration - FoC'], errors='coerce').fillna(0).astype(int)

    df[['Brand owner (From Inventory)', 'Brand (From Inventory)']] = pd.DataFrame(
        df['Location - Installation'].apply(parse_location).tolist(), index=df.index)
    df['Service'] = df['Resource'].apply(classify_service)

    # Sanity checks — fail loudly rather than produce a plausible-looking wrong report
    st = pd.to_datetime(df['Start date'], format='%d-%b-%Y', errors='coerce')
    en = pd.to_datetime(df['End date'], format='%d-%b-%Y', errors='coerce')
    problems = []
    if st.isna().any():
        problems.append(f"{st.isna().sum()} rows with unparseable start date")
    if en.isna().any():
        problems.append(f"{en.isna().sum()} rows with unparseable end date")
    if (en < st).any():
        problems.append(f"{(en < st).sum()} rows with end date before start date")
    if df['Service Location'].isna().any():
        problems.append(f"{df['Service Location'].isna().sum()} rows with blank Service Location")
    for p in problems:
        print('WARNING:', p)

    df.to_excel(dst, index=False)
    print(f"Converted {len(df)} rows -> {dst}")
    print(df['Service'].value_counts().to_string())
    print(f"Rows with FOC > 0: {(df['Duration - FoC'] > 0).sum()}")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
