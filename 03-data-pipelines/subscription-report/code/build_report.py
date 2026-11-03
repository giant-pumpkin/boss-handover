"""
Subscription Report Builder
Usage: python build_report.py <input_xlsx> <output_xlsx> [options]

Options:
  --start-year    INT   Report start year (default: 2025)
  --start-month   INT   Report start month (default: 1)
  --end-year      INT   Report end year (default: 2026)
  --end-month     INT   Report end month (default: 8)
  --service       STR   Service filter (default: "Digital signage"). Pass "ALL" to include everything.
  --movement-log  STR   Optional inventory movement log CSV for historical location
                        re-attribution (only needed if the input's location field is a
                        live lookup, not a static field like Service Location)
  --alert-log     STR   "Installed - No active subscription" export. Screens physically
                        with the customer whose subscription has lapsed. Carried into the
                        grid as expired-but-still-installed.
  --cms-snapshots STR   Glob of end-of-month CMS Asia exports, e.g. "snaps/2026-*.csv".
                        Filename must start YYYY-MM-DD. Per-month source of truth for
                        whether a screen was physically installed.
  --cms-europe    STR   CMS Europe player export (semicolon-delimited, no ScreenStatus).
                        Covers Starbucks / BFI in Iceland.
"""
import argparse
import os
import pandas as pd
import numpy as np
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment
import calendar, collections

def abs_idx(year, month):
    return year * 12 + (month - 1)

def idx_to_ym(idx):
    return idx // 12, (idx % 12) + 1

def build_report(input_path, output_path,
                 start_year=2025, start_month=1,
                 end_year=2026, end_month=8,
                 service_filter="Digital signage",
                 movement_log=None,
                 alert_log=None,
                 cms_snapshots=None,
                 cms_europe=None):

    df = pd.read_excel(input_path, header=0)
    print(f"Loaded {len(df)} rows")

    if 'Subscription contract' not in df.columns:
        df['Subscription contract'] = np.nan

    df['start'] = pd.to_datetime(df['Start date'], errors='coerce', dayfirst=True)
    df['end']   = pd.to_datetime(df['End date'],   errors='coerce', dayfirst=True)
    df['install_date'] = pd.to_datetime(df['Installation date'], errors='coerce', dayfirst=True)
    df['foc'] = pd.to_numeric(df['Duration - FoC'], errors='coerce').fillna(0).astype(int)

    for col, new in [('Inventory ID',                'inventory_id'),
                     ('Location - Installation',      'location'),
                     ('Brand owner (From Inventory)', 'brand_owner'),
                     ('Brand (From Inventory)',        'brand'),
                     ('Status',                       'status'),
                     ('Subscription contract',        'contract')]:
        df[new] = df[col].astype(str).str.strip()
    df['location'] = df['location'].str.strip('"').str.strip()

    # If brand_owner/brand columns are missing or empty, derive from location string.
    # Location format: CTY - BrandOwner - Brand - Store - StoreNum
    # When BrandOwner == Brand, the formula collapses to: CTY - BrandOwner - Store
    needs_derive = df['brand_owner'].isin(['nan', '']) | df['brand'].isin(['nan', ''])
    if needs_derive.any():
        def parse_loc(loc):
            parts = [p.strip() for p in str(loc).split(' - ')]
            if len(parts) >= 4:
                return parts[1], parts[2]
            elif len(parts) == 3:
                return parts[1], parts[1]  # brand == brand_owner (collapsed)
            return '', ''
        derived = df.loc[needs_derive, 'location'].apply(parse_loc)
        df.loc[needs_derive, 'brand_owner'] = derived.apply(lambda x: x[0])
        df.loc[needs_derive, 'brand'] = derived.apply(lambda x: x[1])

    mask = (
        df['start'].notna() & df['end'].notna() &
        ~df['location'].isin(['nan', '']) &
        ~df['brand_owner'].isin(['nan', '']) &
        ~df['inventory_id'].isin(['nan', ''])
    )
    if service_filter.upper() != 'ALL':
        mask &= (df['Service'] == service_filter)
    df = df[mask].copy().reset_index(drop=True)
    print(f"Filtered to {len(df)} rows")

    # --- Historical location re-attribution (optional) ---------------------
    # Only needed when the input'''s location field is a live lookup (reflects
    # current location, not historical). Not needed when the input already
    # uses a static/linked field like Service Location.
    if movement_log:
        log = pd.read_csv(movement_log)
        log['install'] = pd.to_datetime(log['Installation date'], dayfirst=True, errors='coerce')
        log['created'] = pd.to_datetime(log['Created'], dayfirst=True, errors='coerce')
        log = log[log['ID'].notna() & log['Location - Installation'].notna() & log['install'].notna()]
        log['ID'] = log['ID'].astype(str).str.strip()
        log['Location - Installation'] = (log['Location - Installation']
                                          .astype(str).str.strip().str.strip('"').str.strip())
        stints = (log.sort_values('created')
                     .groupby(['ID', 'install'])['Location - Installation']
                     .last().reset_index()
                     .sort_values(['ID', 'install']))
        def _mode(x):
            vc = x.value_counts()
            return vc.index[0] if len(vc) else (x.iloc[0] if len(x) else '')
        loc_meta = (df.groupby('location')[['brand_owner', 'brand']]
                      .agg(_mode).to_dict('index'))
        def meta_for(loc_str):
            if loc_str in loc_meta:
                m = loc_meta[loc_str]
                return m['brand_owner'], m['brand']
            parts = [p.strip() for p in loc_str.split(' - ')]
            if len(parts) >= 4: return parts[2], parts[1]
            if len(parts) == 3: return parts[1], parts[1]
            return loc_str, loc_str
        timelines = {}
        for sn, grp in stints.groupby('ID'):
            tl = list(zip(grp['install'], grp['Location - Installation']))
            if len(tl) > 1: timelines[sn] = tl
        new_rows, n_split = [], 0
        for _, row in df.iterrows():
            tl = timelines.get(row['inventory_id'])
            if not tl:
                new_rows.append(row); continue
            bounds = [abs_idx(ts.year, ts.month) for ts, _ in tl]
            sub_s = abs_idx(row['start'].year, row['start'].month)
            sub_e = abs_idx(row['end'].year, row['end'].month)
            segs = []
            for i, (ts, loc) in enumerate(tl):
                w_start = bounds[i] if i > 0 else -10**9
                w_end   = bounds[i+1] - 1 if i+1 < len(tl) else 10**9
                s, e = max(sub_s, w_start), min(sub_e, w_end)
                if s <= e: segs.append((s, e, loc, ts))
            if len(segs) <= 1 and (not segs or segs[0][2] == row['location']):
                if segs and pd.isna(row['install_date']):
                    row = row.copy(); row['install_date'] = segs[0][3]
                new_rows.append(row); continue
            n_split += 1
            for s, e, loc, ts in segs:
                seg = row.copy()
                y_s, m_s = idx_to_ym(s); y_e, m_e = idx_to_ym(e)
                seg['start'] = max(row['start'], pd.Timestamp(y_s, m_s, 1))
                last_day = calendar.monthrange(y_e, m_e)[1]
                seg['end'] = min(row['end'], pd.Timestamp(y_e, m_e, last_day))
                if loc != tl[-1][1]:
                    seg['location'] = loc
                    bo, br = meta_for(loc)
                    seg['brand_owner'], seg['brand'] = bo, br
                    seg['install_date'] = ts
                elif pd.isna(seg['install_date']):
                    seg['install_date'] = ts
                new_rows.append(seg)
        df = pd.DataFrame(new_rows).reset_index(drop=True)
        print(f"Movement log: {len(timelines)} moved serials, "
              f"{n_split} subscription rows split across locations -> {len(df)} rows")

    REPORT_START  = abs_idx(start_year, start_month)
    REPORT_END    = abs_idx(end_year,   end_month)
    MONTH_IDXS    = list(range(REPORT_START, REPORT_END + 1))
    MONTH_LABELS  = [idx_to_ym(m) for m in MONTH_IDXS]
    MONTH_HEADERS = [f"{calendar.month_abbr[m]}-{str(y)[2:]}" for y, m in MONTH_LABELS]

    df['start_abs']   = df['start'].apply(lambda d: abs_idx(d.year, d.month))
    df['end_abs']     = df['end'].apply(lambda d: abs_idx(d.year, d.month))
    df['install_abs'] = df['install_date'].apply(
        lambda d: abs_idx(d.year, d.month) if pd.notna(d) else np.nan)
    # FOC is the first N months of the CONTRACT, not of each subscription
    # record. A screen swapped in mid-contract has a later record start; if FOC
    # were counted from that it would restart its own free period. Contract
    # start = earliest record start on that contract.
    _has_c = ~df['contract'].isin(['nan', ''])
    _cstart = df[_has_c].groupby('contract')['start_abs'].min()
    df['contract_start_abs'] = df['contract'].map(_cstart).where(_has_c, df['start_abs'])
    df['contract_start_abs'] = df['contract_start_abs'].fillna(df['start_abs'])
    df['foc_end_abs'] = df.apply(
        lambda r: r['contract_start_abs'] + r['foc'] - 1 if r['foc'] > 0 else np.nan, axis=1)

    tmp = df.sort_values(['inventory_id', 'start_abs']).copy()
    tmp['is_renewal'] = tmp.groupby('inventory_id').cumcount() > 0
    # Assign by INDEX, not position. `.values` pasted sorted-order flags onto
    # rows in original order, so renewal shading depended on export row order.
    df['is_renewal'] = tmp['is_renewal']
    df['is_exp_inst'] = False

    # --- Expired-but-still-installed carry-forward -------------------------
    # An inventory item whose subscription lapsed but which is still
    # physically Installed at the location is still a serviced screen. Carry
    # it forward from the month after its last subscription ended through the
    # end of the report window, flagged so it can be counted separately.
    exp_inst_detail = []
    # --- CMS snapshots: per-month source of truth on physical installation -
    # One end-of-month export per month. Unpaired rows carry no serial in any
    # snapshot, so "installed" == present with a serial and status Online or
    # Offline. Airtable truncates serials to 14 chars; match on that prefix.
    cms_by_month = {}          # m_abs -> set of installed 14-char prefixes
    cms_meta = {}              # p14 -> (client, location) from the latest snapshot
    cms_player_month = {}      # m_abs -> {playerId: (p14, location)} for installed players
    cms_pid_of = {}            # p14 -> {playerId: location where that pairing was seen}
    cms_snap_info = []
    if cms_snapshots:
        import glob as _glob
        files = sorted(_glob.glob(cms_snapshots))
        for fp in files:
            base = os.path.basename(fp)[:10]
            try:
                snap_dt = pd.Timestamp(base)
            except Exception:
                continue
            cm = pd.read_csv(fp, encoding='utf-8-sig', low_memory=False)
            cm = cm.loc[:, [c for c in cm.columns
                            if not str(c).startswith('Unnamed')
                            and 'LAST UPDATED' not in str(c)]]
            cm['sn'] = cm['SerialNumber'].fillna('').astype(str).str.strip().str.upper()
            n_unpaired = int((cm['ScreenStatus'] == 'Unpaired').sum())
            cm = cm[cm['sn'] != ''].copy()
            cm['p14'] = cm['sn'].str[:14]
            # Installed = Online or Offline. Unpaired carries no serial and is
            # already excluded by the serial filter. Deliberately simple: an
            # offline-duration or pre-paired rule was tried and reverted.
            inst = cm[cm['ScreenStatus'].isin(['Online', 'Offline'])]
            m_abs = abs_idx(snap_dt.year, snap_dt.month)
            cms_by_month[m_abs] = set(inst['p14'])
            has_pid = 'PlayerId' in cm.columns
            if has_pid:
                cms_player_month[m_abs] = {str(r.PlayerId): (r.p14, str(r.Location))
                                           for r in inst.itertuples()}
            for r in cm.itertuples():
                cms_meta[r.p14] = (r.Client, r.Location, str(getattr(r, 'FirstContactDate', ''))[:10])
                if has_pid:
                    cms_pid_of.setdefault(r.p14, {})[str(r.PlayerId)] = str(r.Location)
            cms_snap_info.append({'file': base, 'm_abs': m_abs,
                                  'installed': len(cms_by_month[m_abs]),
                                  'unpaired': n_unpaired})
        print(f"CMS snapshots loaded: {len(cms_by_month)} months "
              f"({', '.join(s['file'] for s in cms_snap_info)})")

    P14 = lambda x: str(x).strip().upper()[:14]

    # (serial, month) pairs that a real subscription record covers. Used to stop
    # player-based validation double counting: if the serial now on the player
    # is itself billed that month, the old serial is stale, not swapped-unrecorded.
    _cov = df[(df['end_abs'] >= REPORT_START) & (df['start_abs'] <= REPORT_END)]
    covered_pairs = set()
    for r in _cov.itertuples():
        for m in range(max(int(r.start_abs), REPORT_START), min(int(r.end_abs), REPORT_END) + 1):
            covered_pairs.add((P14(r.inventory_id), m))

    def cms_check(inv_id, m_abs):
        """Is this screen installed in month m_abs, per CMS?

        Returns (kind, detail):
          ('serial', None)                 serial itself is Online/Offline
          ('player', (pid, other_serial))  serial absent, but a CMS player this
                                           serial was paired to is live at the
                                           SAME CMS location with another serial
                                           -> screen swapped, swap not in Airtable
          ('absent', None)                 not installed
        The location guard matters: a player moved to another store must not
        validate a screen that left.
        """
        p = P14(inv_id)
        if p in cms_by_month.get(m_abs, ()):
            return 'serial', None
        live = cms_player_month.get(m_abs, {})
        for pid, loc_seen in cms_pid_of.get(p, {}).items():
            if pid in live:
                other, loc_now = live[pid]
                if other != p and loc_now == loc_seen and (other, m_abs) not in covered_pairs:
                    return 'player', (pid, other)
        return 'absent', None

    unrecorded_swaps = {}   # (inv_id, m_abs) -> (pid, other_serial)
    def cms_installed(inv_id, m_abs, location='', brand='', brand_owner=''):
        kind, detail = cms_check(inv_id, m_abs)
        if kind == 'player':
            unrecorded_swaps[(inv_id, m_abs)] = (detail, location, brand, brand_owner)
        return kind != 'absent'

    # --- Europe CMS (separate server: Starbucks / BFI in Iceland) ----------
    # This export is a single point-in-time pull with no ScreenStatus column,
    # so installation is inferred from the contact window: a screen counts as
    # installed in month M if it had first contacted by the end of M and was
    # still contacting at or after the end of M. Only added to months that
    # already have an Asia snapshot, so no month gains a partial truth set.
    europe_n = 0
    if cms_europe and cms_by_month:
        eu = pd.read_csv(cms_europe, encoding='utf-8-sig', sep=';')
        eu['sn'] = eu['SerialNumber'].fillna('').astype(str).str.strip().str.upper()
        eu = eu[eu['sn'] != ''].copy()
        eu['p14'] = eu['sn'].str[:14]
        eu['fc'] = pd.to_datetime(eu['FirstContactDate'], errors='coerce', utc=True)
        eu['lc'] = pd.to_datetime(eu['LastContactDate'], errors='coerce', utc=True)
        eu = eu.drop_duplicates(subset=['p14'])
        for m_abs in list(cms_by_month.keys()):
            y, m = idx_to_ym(m_abs)
            eom = pd.Timestamp(y, m, calendar.monthrange(y, m)[1], tz='UTC')
            add = set(eu[(eu['fc'] <= eom) & (eu['lc'] >= eom)]['p14'])
            cms_by_month[m_abs] |= add
        europe_n = eu['p14'].nunique()
        for r in eu.itertuples():
            cms_meta.setdefault(r.p14, ('Europe server', r.Location, str(r.FirstContactDate)[:10]))
        print(f"Europe CMS: {europe_n} screens folded into snapshot months")

    # A brand owner with zero screens in any snapshot is not managed in this
    # CMS instance (e.g. BFI/Starbucks). Masking those to zero would be wrong,
    # so they are held out of CMS validation and reported separately.
    cms_scoped_bos, cms_unscoped_bos = set(), set()
    if cms_by_month:
        all_cms = set().union(*cms_by_month.values())
        in_window = df[(df['start_abs'] <= REPORT_END) & (df['end_abs'] >= REPORT_START)]
        bos_in_window = set(in_window['brand_owner'])
        for bo, g in df.groupby('brand_owner'):
            if any(P14(i) in all_cms for i in g['inventory_id'].unique()):
                cms_scoped_bos.add(bo)
            elif bo in bos_in_window:
                cms_unscoped_bos.add(bo)
        if cms_unscoped_bos:
            print(f"Brand owners not present in CMS (held out of validation): "
                  f"{', '.join(sorted(cms_unscoped_bos))}")

    # --- Expired-but-still-installed: derived from history + CMS -----------
    # A screen counts as expired-but-still-installed in month M when:
    #   * it has subscription history ending BEFORE M (it was a customer screen),
    #   * no subscription record covers M, and
    #   * CMS shows it installed in M.
    # This catches holes in a chain of contracts (a missing month between two
    # records) as well as plain lapses. The alert list cannot: it is a
    # current-state view, so a screen that has a subscription *today* never
    # appears on it, even if it went unbilled for months earlier.
    #
    # Months with no CMS snapshot, or brand owners CMS does not cover, fall
    # back to the alert list: on the list AND past its last subscription end.
    alert_status, installed_ids = {}, set()
    if alert_log:
        al = pd.read_csv(alert_log, encoding='utf-8-sig')
        al['ID'] = al['ID'].astype(str).str.strip()
        al = al[al['Status'].astype(str).str.strip().str.lower() == 'installed']
        alert_status = dict(zip(al['ID'], al['Subscription - Status'].astype(str).str.strip()))
        installed_ids = set(al['ID'])

    recon = None
    if alert_log or cms_by_month:
        carry_rows = []
        recon = {'alert_rows': len(installed_ids), 'carried': 0, 'screen_months': 0,
                 'from_alert': 0, 'from_history': 0, 'hole_months': 0,
                 'lapse_months': 0}
        for inv_id, grp in df.groupby('inventory_id'):
            g = grp.sort_values('end_abs')
            spans = list(zip(g['start_abs'].astype(int), g['end_abs'].astype(int)))
            last_end = int(g['end_abs'].max())
            bo = g.iloc[-1]['brand_owner']
            on_alert = inv_id in installed_ids
            months, kinds = [], []
            for m_abs in range(REPORT_START, REPORT_END + 1):
                if any(s_ <= m_abs <= e_ for s_, e_ in spans):
                    continue                                   # covered
                prior = g[g['end_abs'] < m_abs]
                if prior.empty:
                    continue                                   # no history yet
                validated = bool(cms_by_month) and bo in cms_scoped_bos \
                            and m_abs in cms_by_month
                if validated:
                    _last = g[g['end_abs'] < m_abs].iloc[-1]
                    ok = cms_installed(inv_id, m_abs, _last['location'],
                                       _last['brand'], _last['brand_owner'])
                else:
                    ok = on_alert and m_abs > last_end
                if not ok:
                    continue
                months.append(m_abs)
                kinds.append('lapse' if m_abs > last_end else 'hole')
            if not months:
                continue
            for m_abs in months:
                src0 = g[g['end_abs'] < m_abs].iloc[-1]        # record just before the gap
                src = src0.copy()
                src['start_abs'] = m_abs
                src['end_abs']   = m_abs
                y_s, m_s = idx_to_ym(m_abs)
                src['start'] = pd.Timestamp(y_s, m_s, 1)
                src['end']   = pd.Timestamp(y_s, m_s, calendar.monthrange(y_s, m_s)[1])
                src['status']       = 'Expired - still installed'
                src['contract']     = ''
                src['is_renewal']   = False
                src['is_exp_inst']  = True
                src['foc']          = 0
                src['foc_end_abs']  = np.nan
                src['contract_key'] = f"{inv_id}||{src['location']}||expinst{m_abs}"
                carry_rows.append(src)
            recon['screen_months'] += len(months)
            recon['hole_months']   += kinds.count('hole')
            recon['lapse_months']  += kinds.count('lapse')
            recon['from_alert' if on_alert else 'from_history'] += 1

            src0 = g[g['end_abs'] < months[0]].iloc[-1]
            ly, lm = idx_to_ym(int(src0['end_abs']))
            exp_inst_detail.append({
                'Inventory ID': inv_id,
                'Resource': src0.get('Resource', ''),
                'Location': src0['location'],
                'Brand': src0['brand'],
                'Brand Owner': src0['brand_owner'],
                'Last contract': src0['contract'],
                'Subscription ended': f"{calendar.month_abbr[lm]}-{str(ly)[2:]}",
                'Alert status': alert_status.get(inv_id,
                                 'Not on alert list (gap found from history + CMS)'),
                'Gap type': ('Hole between contracts' if 'lapse' not in kinds else
                             'Lapsed' if 'hole' not in kinds else 'Hole + lapsed'),
                'CMS installed months': ', '.join(
                    f"{calendar.month_abbr[idx_to_ym(m)[1]]}" for m in months),
                'CMS location': cms_meta.get(P14(inv_id), ('', '', ''))[1],
                'Months carried in window': len(months),
            })

        if carry_rows:
            df = pd.concat([df, pd.DataFrame(carry_rows)], ignore_index=True)
        recon['carried'] = len(exp_inst_detail)
        print(f"Expired-but-installed: {len(exp_inst_detail)} screens, {len(carry_rows)} "
              f"screen-months ({recon['hole_months']} in holes between contracts, "
              f"{recon['lapse_months']} after a lapse)")

    # --- Slot chaining for swap detection & dedup --------------------------
    # A contract can cover MULTIPLE simultaneous physical units at one
    # location (e.g. a 15-screen venue on one contract) — those must all
    # keep counting. A contract can also cover a single unit that gets
    # physically swapped mid-contract (old serial ends, new serial starts
    # right after) — those should collapse to ONE active unit, not two.
    # Chaining tells these apart: a row only continues an existing "slot"
    # if its start sits right at/after that slot's current end (0 to 1
    # month gap); negative gaps (concurrent) always get separate slots.
    SWAP_GAP_MONTHS = 1
    df['contract_key'] = df['inventory_id'] + '||' + df['location']
    df.loc[df['is_exp_inst'], 'contract_key'] = (
        df.loc[df['is_exp_inst'], 'inventory_id'] + '||'
        + df.loc[df['is_exp_inst'], 'location'] + '||expinst')
    swap_comment_lkp = {}

    has_contract = ~df['contract'].isin(['nan', ''])

    # Ambiguous serial guard: some truncated 14-char serials in this table
    # collide with 2+ distinct full serials elsewhere. Never chain those —
    # keep them at their raw per-serial key so nothing gets merged based on
    # a guess.
    groups = collections.defaultdict(set)
    for s in df['inventory_id'].unique():
        s = str(s).strip()
        if '/' not in s and 14 <= len(s) <= 16:
            groups[s[:14]].add(s)
    AMBIG = {p for p, v in groups.items() if len({x for x in v if len(x) > 14}) > 1}

    for (contract, location), grp in df[has_contract].groupby(['contract', 'location']):
        recs = grp.sort_values('start_abs').reset_index().to_dict('records')
        slots = []
        for rec in recs:
            if str(rec['inventory_id']).strip() in AMBIG:
                continue  # leave default contract_key (own inventory_id+location)
            best_si, best_gap = None, None
            for si, s in enumerate(slots):
                gap = rec['start_abs'] - s['end_abs']
                # Successor must start AT or AFTER predecessor's end. Negative
                # gaps mean the rows are concurrent (multi-screen store), not
                # a hand-off — never chain those.
                #
                # It must also start STRICTLY LATER than the predecessor did.
                # Without this, rows sharing an identical span (several screens
                # at one store on one short umbrella contract) see gap == 0 and
                # every one of them collapses into the first slot. Short
                # backfill contracts spanning hundreds of screens make this the
                # normal case, not an edge case.
                concurrent = s['start_abs'] >= rec['start_abs']
                if 0 <= gap <= SWAP_GAP_MONTHS and not concurrent:
                    same_serial = (s['inventory_id'] == rec['inventory_id'])
                    cand = (not same_serial, abs(gap))  # prefer same serial, then smallest gap
                    if best_gap is None or cand < best_gap:
                        best_si, best_gap = si, cand
            if best_si is None:
                slots.append({'start_abs': rec['start_abs'], 'end_abs': rec['end_abs'],
                              'end': rec['end'], 'inventory_id': rec['inventory_id']})
                slot_id = len(slots) - 1
            else:
                prev = slots[best_si]
                if prev['inventory_id'] != rec['inventory_id']:
                    key = (location, rec['brand_owner'], rec['start_abs'])
                    swap_comment_lkp[key] = (
                        f"Screen swap on contract {contract}:\n"
                        f"{prev['inventory_id']} ended {prev['end'].strftime('%d-%b-%y')}\n"
                        f"{rec['inventory_id']} started {rec['start'].strftime('%d-%b-%y')}")
                slots[best_si] = {'start_abs': rec['start_abs'], 'end_abs': rec['end_abs'],
                                  'end': rec['end'], 'inventory_id': rec['inventory_id']}
                slot_id = best_si
            df.loc[rec['index'], 'contract_key'] = f"{contract}||{location}||slot{slot_id}"

    frames = []
    for m_abs in MONTH_IDXS:
        mdf = df[(df['start_abs'] <= m_abs) & (df['end_abs'] >= m_abs)].copy()
        if mdf.empty: continue
        mdf = mdf[['inventory_id','location','brand_owner','brand','status',
                    'start_abs','end_abs','foc','foc_end_abs','is_renewal','install_abs',
                    'contract_key','is_exp_inst']].copy()
        mdf['m_abs'] = m_abs
        mdf['is_foc']          = (mdf['foc'] > 0) & mdf['foc_end_abs'].notna() & (mdf['foc_end_abs'] >= m_abs)
        mdf['is_renewal_this'] = mdf['is_renewal'] & (mdf['start_abs'] == m_abs)
        mdf['is_last_month']   = (mdf['end_abs'] == m_abs)
        frames.append(mdf)

    act_df = pd.concat(frames, ignore_index=True)
    act_df = act_df.sort_values(['inventory_id','m_abs','start_abs','end_abs'],
                                 ascending=[True,True,False,False])
    act = act_df.drop_duplicates(subset=['inventory_id','m_abs'], keep='first').copy()

    # Contract-aware dedup: collapse same-contract-slot rows per month so a
    # mid-contract screen swap counts as ONE active unit in its overlap month.
    # Within a slot-month, prefer the serial CMS confirms is installed. In a
    # swap month both serials share the slot; keeping the incoming one blindly
    # loses the slot whenever CMS says the incoming screen isn't there yet
    # (or the swap record is wrong) while the outgoing screen still is.
    def _row_ok(r):
        if not cms_by_month or r.brand_owner not in cms_scoped_bos: return True
        if r.m_abs not in cms_by_month or r.is_exp_inst:            return True
        return cms_installed(r.inventory_id, r.m_abs, r.location, r.brand, r.brand_owner)
    act['cms_ok_row'] = [_row_ok(r) for r in act.itertuples()]
    act_c = (act.sort_values(['contract_key','m_abs','cms_ok_row','start_abs'],
                              ascending=[True, True, False, False])
                .drop_duplicates(subset=['contract_key','m_abs'], keep='first')
                .copy())

    # --- Per-month CMS validation of the active population ------------------
    # A subscription that is live but whose screen CMS does not show installed
    # that month is an exception, not a serviced screen. Pull those out.
    cms_excluded = []
    if cms_by_month:
        def month_ok(r):
            if r.brand_owner not in cms_scoped_bos:  return True   # not in CMS
            if r.m_abs not in cms_by_month:          return True   # no snapshot
            if r.is_exp_inst:                        return True   # already validated
            return bool(r.cms_ok_row)
        keep = np.array([month_ok(r) for r in act_c.itertuples()])
        dropped = act_c[~keep].copy()
        for r in dropped.itertuples():
            y, m = idx_to_ym(r.m_abs)
            cms_excluded.append({
                'Inventory ID': r.inventory_id, 'Location': r.location,
                'Brand': r.brand, 'Brand Owner': r.brand_owner,
                'Month': f"{calendar.month_abbr[m]}-{str(y)[2:]}",
                'CMS status that month': 'Not installed (unpaired / absent)'})
        act_c = act_c[keep].copy()
        print(f"CMS validation removed {len(dropped)} screen-months where an active "
              f"subscription had no installed screen")

    active_pairs = set(zip(act_c['inventory_id'], act_c['m_abs']))

    def ending_type(r):
        if not r['is_last_month']: return None
        if (r['inventory_id'], r['m_abs'] + 1) in active_pairs: return None
        return r['status'].lower()

    act_c['ending_type']   = act_c.apply(ending_type, axis=1)
    act_c['is_terminated'] = act_c['ending_type'] == 'terminated'
    act_c['is_expired']    = act_c['ending_type'] == 'expired'

    cell = act_c.groupby(['location','brand_owner','m_abs']).agg(
        count=('inventory_id','count'),
        n_exp_inst=('is_exp_inst','sum'),
        has_renewal=('is_renewal_this','any'),
        has_foc=('is_foc','any'),
        has_terminated=('is_terminated','any'),
        has_expired=('is_expired','any'),
        brand=('brand','first'),
    ).reset_index()
    cell['n_exp_inst'] = cell['n_exp_inst'].astype(int)
    cell['n_active']   = cell['count'] - cell['n_exp_inst']
    cell['has_exp_inst'] = cell['n_exp_inst'] > 0

    # Hover note breaking out the split for any cell that mixes the two
    exp_note_lkp = {}
    for r in cell.itertuples():
        if r.n_exp_inst > 0:
            exp_note_lkp[(r.location, r.brand_owner, r.m_abs)] = (
                f"Total screens: {int(r.count)}\n"
                f"  Active subscription: {int(r.n_active)}\n"
                f"  Expired, still installed: {int(r.n_exp_inst)}")

    cell['is_swap'] = cell.apply(
        lambda r: (r['location'], r['brand_owner'], r['m_abs']) in swap_comment_lkp, axis=1)

    cell['first_install_abs'] = cell['location'].map(df.groupby('location')['install_abs'].min())
    cell['first_start_abs']   = cell['location'].map(df.groupby('location')['start_abs'].min())
    cell['is_install_month']  = cell['first_install_abs'].notna() & (cell['m_abs'] == cell['first_install_abs'])
    cell['is_pre_install']    = cell['first_install_abs'].notna() & (cell['m_abs'] < cell['first_install_abs'])
    cell['is_new_location']   = (cell['m_abs'] == cell['first_start_abs']) & (cell['first_start_abs'] >= REPORT_START)

    F_ORANGE = PatternFill('solid', fgColor='FFB347')
    F_YELLOW = PatternFill('solid', fgColor='FFFF99')
    F_DKGRN  = PatternFill('solid', fgColor='00B050')
    F_LTGRN  = PatternFill('solid', fgColor='C6EFCE')
    F_BLUE   = PatternFill('solid', fgColor='BDD7EE')
    F_RED    = PatternFill('solid', fgColor='FFCCCC')
    F_PEACH  = PatternFill('solid', fgColor='D9D9D9')  # light grey — was peach (FFCC99), too close to orange
    F_PURPLE = PatternFill('solid', fgColor='CC99FF')
    F_EXPINS = PatternFill('solid', fgColor='FF8C69')  # salmon — expired but still installed
    F_NONE   = PatternFill('none')

    def pick_fill(row):
        if row['has_exp_inst']:      return F_EXPINS
        if row['is_install_month']:  return F_ORANGE
        if row['is_swap']:           return F_PURPLE
        if row['is_pre_install']:    return F_YELLOW
        if row['has_foc']:           return F_DKGRN
        if row['is_new_location']:   return F_LTGRN
        if row['has_renewal']:       return F_BLUE
        if row['has_terminated']:    return F_RED
        if row['has_expired']:       return F_PEACH
        return F_NONE

    cell['fill'] = cell.apply(pick_fill, axis=1)
    fill_lkp  = {(r.location, r.brand_owner, r.m_abs): r.fill  for r in cell.itertuples()}
    count_lkp = {(r.location, r.brand_owner, r.m_abs): int(r.count) for r in cell.itertuples()}
    expc_lkp  = {(r.location, r.brand_owner, r.m_abs): int(r.n_exp_inst) for r in cell.itertuples()}

    loc_install_str = {}
    for loc, grp in df.groupby('location'):
        dates = sorted({d for d in grp['install_date'] if pd.notna(d)})
        loc_install_str[loc] = ', '.join(d.strftime('%d-%b-%y') for d in dates)

    bo_order = df.groupby('brand_owner')['start_abs'].min().index.tolist()
    bo_loc_order = (df.groupby(['brand_owner','location'])['start_abs']
                    .min().reset_index().sort_values('start_abs'))
    bo_brand = (df.groupby('brand_owner')['brand']
                .apply(lambda x: x.value_counts().index[0]).to_dict())
    bo_order_sorted = sorted(bo_order, key=lambda b: (bo_brand.get(b, ''), b))

    wb = Workbook()
    wb.remove(wb.active)

    HDR_FILL        = PatternFill('solid', fgColor='1F4E79')
    HDR_FONT        = Font(name='Arial', bold=True, size=10, color='FFFFFF')
    DATA_FONT       = Font(name='Arial', size=10)
    DATA_FONT_WHITE = Font(name='Arial', size=10, color='FFFFFF')

    def write_header(ws, row, col, text):
        c = ws.cell(row, col, text)
        c.font = HDR_FONT; c.fill = HDR_FILL
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    KEY_ITEMS = [
        (F_EXPINS, 'Expired subscription, screen STILL INSTALLED (hover for active/expired split)'),
        (F_ORANGE, 'Installation month (subscription active in same month as first installation)'),
        (F_PURPLE, 'Screen swap (same contract, serial replaced mid-contract — hover for details)'),
        (F_YELLOW, 'Pre-installation (subscription active before first installation date)'),
        (F_DKGRN,  'Free of Charge (FOC) months at start of contract'),
        (F_LTGRN,  'Brand new location (first ever subscription)'),
        (F_BLUE,   'Renewal (subscription renewed from a previous period)'),
        (F_RED,    'Terminated (subscription actively cancelled — no successor)'),
        (F_PEACH,  'Expired (contract ran its course — may need renewal)'),
    ]

    used_names = set()
    for bo in bo_order_sorted:
        locs = bo_loc_order[bo_loc_order['brand_owner'] == bo]['location'].tolist()
        if not locs: continue
        sname = bo[:31]
        if sname in used_names: sname = bo[:28] + '_2'
        used_names.add(sname)
        ws = wb.create_sheet(title=sname)
        write_header(ws, 1, 1, 'Location')
        write_header(ws, 1, 2, 'Installation Date')
        for i, mh in enumerate(MONTH_HEADERS):
            write_header(ws, 1, 3+i, mh)
        ws.column_dimensions['A'].width = 55
        ws.column_dimensions['B'].width = 22
        for i in range(len(MONTH_HEADERS)):
            ws.column_dimensions[get_column_letter(3+i)].width = 9
        ws.row_dimensions[1].height = 28
        for r_idx, loc in enumerate(locs, start=2):
            ws.cell(r_idx, 1, loc).font = DATA_FONT
            c = ws.cell(r_idx, 2, loc_install_str.get(loc, ''))
            c.font = DATA_FONT; c.alignment = Alignment(horizontal='center')
            for mi, m_abs in enumerate(MONTH_IDXS):
                cnt  = count_lkp.get((loc, bo, m_abs), 0)
                fill = fill_lkp.get((loc, bo, m_abs), F_NONE)
                c = ws.cell(r_idx, 3+mi, cnt if cnt > 0 else None)
                c.alignment = Alignment(horizontal='center')
                c.font = DATA_FONT_WHITE if fill is F_DKGRN else DATA_FONT
                if fill is not F_NONE:
                    c.fill = fill
                notes = [n for n in (exp_note_lkp.get((loc, bo, m_abs)),
                                     swap_comment_lkp.get((loc, bo, m_abs))) if n]
                if notes:
                    c.comment = Comment('\n\n'.join(notes), 'Subscription report')
        ws.freeze_panes = 'C2'
        key_start = ws.max_row + 2
        ws.cell(key_start, 1, 'Key:').font = Font(name='Arial', bold=True, size=9)
        for ki, (fill, desc) in enumerate(KEY_ITEMS):
            r = key_start + 1 + ki
            swatch = ws.cell(r, 1)
            swatch.fill = fill
            swatch.font = Font(name='Arial', size=9,
                               color='FFFFFF' if fill is F_DKGRN else '000000')
            swatch.value = '      '
            dc = ws.cell(r, 2, desc)
            dc.font = Font(name='Arial', size=9)
            ws.merge_cells(start_row=r, start_column=2,
                           end_row=r, end_column=min(5, 2+len(MONTH_HEADERS)))

    ov = wb.create_sheet('Overview', index=0)
    write_header(ov, 1, 1, 'Brand')
    write_header(ov, 1, 2, 'Brand Owner')
    for i, mh in enumerate(MONTH_HEADERS):
        write_header(ov, 1, 3+i, mh)
    ov.column_dimensions['A'].width = 28
    ov.column_dimensions['B'].width = 28
    for i in range(len(MONTH_HEADERS)):
        ov.column_dimensions[get_column_letter(3+i)].width = 9
    ov.row_dimensions[1].height = 28

    # Summary by BRAND + BRAND OWNER, three stacked blocks:
    # total serviced screens / active subscription only / expired-still-installed
    act_c['_one'] = 1
    tot_lkp = act_c.groupby(['brand_owner','brand','m_abs'])['_one'].sum().to_dict()
    exp_lkp = act_c[act_c['is_exp_inst']].groupby(['brand_owner','brand','m_abs'])['_one'].sum().to_dict()
    foc_lkp = act_c[act_c['is_foc'] & ~act_c['is_exp_inst']].groupby(['brand_owner','brand','m_abs'])['_one'].sum().to_dict()

    pairs = sorted({(r.brand_owner, r.brand) for r in act_c.itertuples()},
                   key=lambda p: (p[1], p[0]))

    BLOCK_FILL = PatternFill('solid', fgColor='2E75B6')
    TOTAL_FONT = Font(name='Arial', bold=True, size=10)
    TOTAL_FILL = PatternFill('solid', fgColor='DDEBF7')

    def write_block(start_row, label, getter, label_fill):
        c = ov.cell(start_row, 1, label)
        c.font = Font(name='Arial', bold=True, size=10, color='FFFFFF')
        c.fill = label_fill
        ov.merge_cells(start_row=start_row, start_column=1,
                       end_row=start_row, end_column=2 + len(MONTH_HEADERS))
        r = start_row + 1
        col_tot = collections.defaultdict(int)
        for bo, br in pairs:
            ov.cell(r, 1, br).font = DATA_FONT
            ov.cell(r, 2, bo).font = DATA_FONT
            for mi, m_abs in enumerate(MONTH_IDXS):
                v = getter(bo, br, m_abs)
                col_tot[m_abs] += v
                cc = ov.cell(r, 3 + mi, v if v > 0 else None)
                cc.font = DATA_FONT
                cc.alignment = Alignment(horizontal='center')
            r += 1
        tc = ov.cell(r, 1, 'TOTAL'); tc.font = TOTAL_FONT; tc.fill = TOTAL_FILL
        ov.cell(r, 2, '').fill = TOTAL_FILL
        for mi, m_abs in enumerate(MONTH_IDXS):
            cc = ov.cell(r, 3 + mi, col_tot[m_abs] if col_tot[m_abs] else None)
            cc.font = TOTAL_FONT; cc.fill = TOTAL_FILL
            cc.alignment = Alignment(horizontal='center')
        return r + 2

    nr = write_block(2, 'TOTAL SCREENS SERVICED  (active subscription + expired but still installed)',
                     lambda bo, br, m: int(tot_lkp.get((bo, br, m), 0)), BLOCK_FILL)
    nr = write_block(nr, 'ACTIVE SUBSCRIPTION  (billable)',
                     lambda bo, br, m: int(tot_lkp.get((bo, br, m), 0))
                                       - int(exp_lkp.get((bo, br, m), 0))
                                       - int(foc_lkp.get((bo, br, m), 0)),
                     PatternFill('solid', fgColor='548235'))
    nr = write_block(nr, 'ACTIVE SUBSCRIPTION, FREE-OF-CHARGE MONTH  (serviced, not billed)',
                     lambda bo, br, m: int(foc_lkp.get((bo, br, m), 0)),
                     PatternFill('solid', fgColor='00B050'))
    nr = write_block(nr, 'EXPIRED SUBSCRIPTION, SCREEN STILL INSTALLED',
                     lambda bo, br, m: int(exp_lkp.get((bo, br, m), 0)),
                     PatternFill('solid', fgColor='C55A11'))

    ov.freeze_panes = 'C2'

    # --- Detail tab: every expired-but-still-installed screen --------------
    if exp_inst_detail:
        det = wb.create_sheet('Expired - Still Installed')
        cols = ['Inventory ID', 'Resource', 'Location', 'Brand', 'Brand Owner',
                'Last contract', 'Subscription ended', 'Alert status', 'Gap type',
                'CMS installed months', 'CMS location', 'Months carried in window']
        widths = [22, 34, 52, 20, 20, 34, 20, 30, 22, 28, 40, 24]
        for i, (cn, w) in enumerate(zip(cols, widths), start=1):
            write_header(det, 1, i, cn)
            det.column_dimensions[get_column_letter(i)].width = w
        det.row_dimensions[1].height = 28
        rows = sorted(exp_inst_detail, key=lambda d: (d['Brand'], d['Brand Owner'],
                                                      d['Location'], d['Inventory ID']))
        for ri, rec in enumerate(rows, start=2):
            for ci, cn in enumerate(cols, start=1):
                c = det.cell(ri, ci, rec[cn])
                c.font = DATA_FONT
                if cn in ('Subscription ended', 'Alert status',
                          'Months carried in window'):
                    c.alignment = Alignment(horizontal='center')
            det.cell(ri, 7).fill = F_EXPINS
        det.freeze_panes = 'A2'
        det.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{len(rows)+1}"

    # --- CMS validation tabs ----------------------------------------------
    cms_val = None
    if cms_by_month:
        end_snap = cms_by_month.get(REPORT_END, set())
        act_end = act_c[(act_c['m_abs'] == REPORT_END) & (~act_c['is_exp_inst'])]
        exp_end = act_c[(act_c['m_abs'] == REPORT_END) & (act_c['is_exp_inst'])]
        p_active = {P14(i) for i in act_end['inventory_id']}
        p_expinst = {P14(i) for i in exp_end['inventory_id']}
        p_hist = {P14(i) for i in df['inventory_id']}
        p_future = {P14(i) for i in df[(~df['is_exp_inst']) & (df['start_abs'] > REPORT_END)]['inventory_id']}
        bucket = {'active': [], 'exp': [], 'nocontract': [], 'upcoming': [], 'other': []}
        for p in sorted(end_snap):
            if p in p_active:     bucket['active'].append(p)
            elif p in p_expinst:  bucket['exp'].append(p)
            elif p not in p_hist: bucket['nocontract'].append(p)
            elif p in p_future:   bucket['upcoming'].append(p)   # installed, contract starts next month
            else:                 bucket['other'].append(p)
        cms_val = {'installed': len(end_snap),
                   'active': len(bucket['active']), 'exp': len(bucket['exp']),
                   'nocontract': len(bucket['nocontract']), 'other': len(bucket['other']),
                   'upcoming': len(bucket['upcoming']),
                   'excluded_months': len(cms_excluded),
                   'unscoped': sorted(cms_unscoped_bos)}

        if cms_excluded:
            uc = wb.create_sheet('CMS - Billed Not Installed')
            ucols = ['Inventory ID', 'Location', 'Brand', 'Brand Owner', 'Month',
                     'CMS status that month']
            for i, (cn, w) in enumerate(zip(ucols, [22, 52, 20, 20, 12, 34]), start=1):
                write_header(uc, 1, i, cn)
                uc.column_dimensions[get_column_letter(i)].width = w
            uc.row_dimensions[1].height = 28
            rows = sorted(cms_excluded, key=lambda d: (d['Brand Owner'], d['Location'],
                                                       d['Inventory ID'], d['Month']))
            for ri, rec in enumerate(rows, start=2):
                for ci, cn in enumerate(ucols, start=1):
                    c = uc.cell(ri, ci, rec[cn]); c.font = DATA_FONT
                uc.cell(ri, 6).fill = PatternFill('solid', fgColor='FFC7CE')
            uc.freeze_panes = 'A2'
            uc.auto_filter.ref = f"A1:{get_column_letter(len(ucols))}{len(rows)+1}"

        if unrecorded_swaps:
            us = wb.create_sheet('CMS - Serial Mismatch')
            ucols2 = ['Inventory ID (in Airtable)', 'Serial on the live CMS player',
                      'CMS player', 'Location', 'Brand', 'Brand Owner', 'Month']
            for i, (cn, wd) in enumerate(zip(ucols2, [26, 28, 14, 52, 20, 20, 10]), start=1):
                write_header(us, 1, i, cn)
                us.column_dimensions[get_column_letter(i)].width = wd
            us.row_dimensions[1].height = 28
            rows2 = []
            for (inv, m_abs), ((pid, other), loc, br, bo) in unrecorded_swaps.items():
                if not (REPORT_START <= m_abs <= REPORT_END): continue
                y, m = idx_to_ym(m_abs)
                rows2.append([inv, other, pid, loc, br, bo,
                              f"{calendar.month_abbr[m]}-{str(y)[2:]}", m_abs])
            rows2.sort(key=lambda x: (x[5], x[3], x[0], x[7]))
            for ri, rec in enumerate(rows2, start=2):
                for ci, v in enumerate(rec[:7], start=1):
                    c = us.cell(ri, ci, v); c.font = DATA_FONT
                us.cell(ri, 2).fill = PatternFill('solid', fgColor='FFEB9C')
            us.freeze_panes = 'A2'
            if rows2:
                us.auto_filter.ref = f"A1:G{len(rows2)+1}"
            n_unrec = len(rows2)
        else:
            n_unrec = 0

        nc = wb.create_sheet('CMS - Installed No Contract')
        ncols = ['CMS serial (14)', 'CMS client', 'CMS location', 'CMS first contact', 'Note']
        for i, (cn, w) in enumerate(zip(ncols, [22, 34, 52, 16, 52]), start=1):
            write_header(nc, 1, i, cn)
            nc.column_dimensions[get_column_letter(i)].width = w
        nc.row_dimensions[1].height = 28
        ey, em = idx_to_ym(REPORT_END)
        for ri, p in enumerate(bucket['nocontract'], start=2):
            cl_, lo_, fc_ = (cms_meta.get(p, ()) + ('', '', ''))[:3]
            note = ''
            if fc_[:7] == f"{ey:04d}-{em:02d}":
                note = ('Installed this month. Digital signage bills from the 1st of the '
                        'following month (non-POC), so no contract is expected yet.')
            for ci, v in enumerate([p, cl_, lo_, fc_, note], start=1):
                c = nc.cell(ri, ci, v); c.font = DATA_FONT
            if note:
                nc.cell(ri, 5).fill = PatternFill('solid', fgColor='E2EFDA')
        nc.freeze_panes = 'A2'
        if bucket['nocontract']:
            nc.auto_filter.ref = f"A1:C{len(bucket['nocontract'])+1}"

    # --- Reconciliation tab -----------------------------------------------
    if recon:
        rc = wb.create_sheet('Reconciliation')
        rc.column_dimensions['A'].width = 66
        rc.column_dimensions['B'].width = 14
        rc.column_dimensions['C'].width = 76
        for i, h in enumerate(['Step', 'Screens', 'Explanation'], start=1):
            write_header(rc, 1, i, h)
        rc.row_dimensions[1].height = 28
        end_lbl = MONTH_HEADERS[-1]
        lines = [
            ('Screens with expired-but-installed months, found on the alert list',
             recon['from_alert'],
             'On the "Installed - No active subscription" export AND uncovered for at '
             'least one installed month inside the window.'),
            ('+ found only from subscription history + CMS', recon['from_history'],
             'NOT on the alert list (they have a subscription today), but had a month '
             'inside the window with no covering record while CMS shows them installed. '
             'Usually a month missing from a chain of short contracts.'),
            ('= Screens carried as expired-but-still-installed', recon['carried'],
             f'Counted per month. Total screen-months: {recon["screen_months"]} — '
             f'{recon["hole_months"]} in holes between contracts, '
             f'{recon["lapse_months"]} after the last contract lapsed.'),
            ('Alert list rows (for reference)', recon['alert_rows'],
             'Current-state view at export date. Not the source of the carried figure; '
             'used only for months with no CMS snapshot or brand owners outside CMS.'),
        ]
        r = 2
        for label, val, note in lines:
            c1 = rc.cell(r, 1, label); c1.font = DATA_FONT
            c2 = rc.cell(r, 2, val); c2.alignment = Alignment(horizontal='center')
            c3 = rc.cell(r, 3, note); c3.font = Font(name='Arial', size=9)
            c3.alignment = Alignment(wrap_text=True, vertical='top')
            rc.row_dimensions[r].height = 30
            if label.startswith('='):
                c1.font = TOTAL_FONT; c2.font = TOTAL_FONT
                c1.fill = TOTAL_FILL; c2.fill = TOTAL_FILL; c3.fill = TOTAL_FILL
            else:
                c2.font = DATA_FONT
            r += 1
        r += 1
        rc.cell(r, 1, 'Month-by-month check').font = TOTAL_FONT
        r += 1
        for i, h in enumerate(['Month', 'Total serviced', 'Active (billable)',
                               'Expired, still installed', 'FOC (not billed)'], start=1):
            write_header(rc, r, i, h)
        rc.column_dimensions['D'].width = 24
        hdr_row = r
        r += 1
        for mi, m_abs in enumerate(MONTH_IDXS):
            tot = int(act_c[act_c['m_abs'] == m_abs].shape[0])
            exp = int(act_c[(act_c['m_abs'] == m_abs) & act_c['is_exp_inst']].shape[0])
            foc = int(act_c[(act_c['m_abs'] == m_abs) & act_c['is_foc'] & ~act_c['is_exp_inst']].shape[0])
            for ci, v in enumerate([MONTH_HEADERS[mi], tot, tot - exp - foc, exp, foc], start=1):
                c = rc.cell(r, ci, v); c.font = DATA_FONT
                c.alignment = Alignment(horizontal='center')
            r += 1

        if cms_val:
            r += 1
            rc.cell(r, 1, 'CMS snapshot coverage').font = TOTAL_FONT
            r += 1
            for i, h in enumerate(['Snapshot', 'Installed (Online+Offline)', 'Unpaired'],
                                  start=1):
                write_header(rc, r, i, h)
            r += 1
            for si in cms_snap_info:
                for ci, v in enumerate([si['file'], si['installed'], si['unpaired']], start=1):
                    c = rc.cell(r, ci, v); c.font = DATA_FONT
                    c.alignment = Alignment(horizontal='center')
                r += 1
            missing = [MONTH_HEADERS[i] for i, m in enumerate(MONTH_IDXS)
                       if m not in cms_by_month]
            if missing:
                c = rc.cell(r, 1, 'Months with NO snapshot: ' + ', '.join(missing)
                            + ' — subscription-driven only, not CMS-validated.')
                c.font = Font(name='Arial', italic=True, size=9, color='C00000')
                r += 1
            if cms_val['unscoped']:
                c = rc.cell(r, 1, 'Brand owners absent from CMS, held out of validation: '
                            + ', '.join(cms_val['unscoped']))
                c.font = Font(name='Arial', italic=True, size=9, color='C00000')
                r += 1

            r += 1
            rc.cell(r, 1, f'CMS estate at {end_lbl}').font = TOTAL_FONT
            r += 1
            est = [
                ('CMS screens Online or Offline (physically installed)',
                 cms_val['installed'],
                 'Source of truth for ' + end_lbl + '. Unpaired excluded — uninstalled.'),
                ('  active subscription', cms_val['active'], 'Billable and on site.'),
                ('  expired / terminated, still installed', cms_val['exp'],
                 'Serviced but not billed. See "Expired - Still Installed" tab.'),
                ('  no signage subscription record at all', cms_val['nocontract'],
                 'Running in CMS, nothing in Subscriptions. '
                 'See "CMS - Installed No Contract" tab.'),
                ('  installed, contract starts after ' + end_lbl, cms_val['upcoming'],
                 'New installs. Signage bills from the 1st of the month after installation, '
                 'so no coverage this month is expected.'),
                ('  other: lapsed history, not on the flagged list', cms_val['other'],
                 'Subscription lapsed but not on the installed-no-active-subscription '
                 'export.'),
                ('  SUM of the five buckets above',
                 cms_val['active'] + cms_val['exp'] + cms_val['nocontract']
                 + cms_val['upcoming'] + cms_val['other'], 'Must equal the CMS installed total.'),
                ('Screen-months kept via CMS player (serial in Airtable differs from CMS)',
                 n_unrec,
                 'Serial in Airtable is absent from CMS, but the CMS player it was paired '
                 'to is live at the same location with another serial. Counted as installed; '
                 'listed on \"CMS - Serial Mismatch\". Either a swap not recorded in Airtable, or a mistyped serial in one system — check before editing.'),
                ('Screen-months removed: active subscription, no installed screen',
                 cms_val['excluded_months'],
                 'Live subscription with no paired screen in that month\'s snapshot. '
                 'Removed from the counts above. See "CMS - Billed Not Installed" tab.'),
            ]
            for label, val, note in est:
                c1 = rc.cell(r, 1, label); c1.font = DATA_FONT
                c2 = rc.cell(r, 2, val); c2.font = DATA_FONT
                c2.alignment = Alignment(horizontal='center')
                c3 = rc.cell(r, 3, note); c3.font = Font(name='Arial', size=9)
                c3.alignment = Alignment(wrap_text=True, vertical='top')
                rc.row_dimensions[r].height = 30
                if label.startswith('Screen-months removed'):
                    for cc in (c1, c2, c3):
                        cc.fill = PatternFill('solid', fgColor='FFC7CE')
                if label.strip().startswith('SUM'):
                    c1.font = TOTAL_FONT; c2.font = TOTAL_FONT
                    for cc in (c1, c2, c3): cc.fill = TOTAL_FILL
                r += 1

    wb.save(output_path)
    print(f"Saved: {output_path}")
    print(f"Sheets: {len(wb.sheetnames)} ({len(wb.sheetnames)-1} brand owners + Overview)")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input')
    parser.add_argument('output')
    parser.add_argument('--start-year',  type=int, default=2025)
    parser.add_argument('--start-month', type=int, default=1)
    parser.add_argument('--end-year',    type=int, default=2026)
    parser.add_argument('--end-month',   type=int, default=8)
    parser.add_argument('--service',     type=str, default='Digital signage')
    parser.add_argument('--movement-log', type=str, default=None)
    parser.add_argument('--alert-log',    type=str, default=None)
    parser.add_argument('--cms-snapshots', type=str, default=None,
                        help='glob for end-of-month CMS exports, e.g. "snaps/2026-*.csv"')
    parser.add_argument('--cms-europe', type=str, default=None,
                        help='Europe CMS player export (semicolon-delimited)')
    args = parser.parse_args()
    build_report(args.input, args.output,
                 args.start_year, args.start_month,
                 args.end_year, args.end_month, args.service,
                 movement_log=args.movement_log,
                 alert_log=args.alert_log,
                 cms_snapshots=args.cms_snapshots,
                 cms_europe=args.cms_europe)
