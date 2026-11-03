"""
convert_cms_snapshots.py
Step 2 of the subscription report pipeline.

The CMS daily logs are stored as .xlsx with the Asia data on a sheet named
"CMS Asia". build_report.py reads CSVs whose filename starts YYYY-MM-DD.
This script converts every end-of-month .xlsx in a folder to that CSV form.

Usage:
    python convert_cms_snapshots.py <folder_of_xlsx> <output_folder>

Pick ONE file per month — the last day of the month. The script assigns a
file to a month purely from the first 10 characters of its filename.
"""
import sys
import glob
import os
import pandas as pd

SHEET = 'CMS Asia'


def main(src_dir, dst_dir):
    os.makedirs(dst_dir, exist_ok=True)
    files = sorted(glob.glob(os.path.join(src_dir, '*.xlsx')))
    if not files:
        sys.exit(f"No .xlsx files found in {src_dir}")
    for f in files:
        base = os.path.basename(f)[:10]
        try:
            pd.Timestamp(base)
        except Exception:
            print(f"SKIP {os.path.basename(f)}: filename must start YYYY-MM-DD")
            continue
        try:
            d = pd.read_excel(f, sheet_name=SHEET)
        except ValueError:
            print(f"SKIP {os.path.basename(f)}: no sheet named '{SHEET}'")
            continue
        d = d.loc[:, [c for c in d.columns
                      if not str(c).startswith('Unnamed') and 'LAST UPDATED' not in str(c)]]
        out = os.path.join(dst_dir, f"{base}_log_-_CMS_Asia.csv")
        d.to_csv(out, index=False)
        n_inst = int(d['ScreenStatus'].isin(['Online', 'Offline']).sum())
        n_ser = int(d['SerialNumber'].fillna('').astype(str).str.strip().ne('').sum())
        flag = '' if n_inst == n_ser else '  <-- WARNING: online+offline != rows with serial'
        print(f"{base}: {len(d)} rows, {n_inst} installed, {n_ser} with serial{flag}")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
