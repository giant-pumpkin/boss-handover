#!/usr/bin/env python3
"""
Scan PDF quotations for screen repair line items and export to CSV.

Usage:
    python scan_screen_repairs.py /path/to/pdf_folder -o output.csv

Requirements:
    pip install pymupdf pytesseract Pillow
"""

import fitz  # PyMuPDF
import re
import os
import csv
import argparse
import sys
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────
# KEYWORDS — what a screen repair LINE ITEM looks like (not T&C boilerplate)
# ─────────────────────────────────────────────────────────────────────
REPAIR_KEYWORDS_EN = [
    "screen repair",
    "monitor repair",
    "display repair",
    "screen replacement",
    "monitor replacement",
    "display replacement",
    "repair service fee",
    "repair fee",
    "repair charge",
    "repair cost",
    "out of warranty repair",
    "warranty repair",
    "damaged screen",
    "broken screen",
    "cracked screen",
    "defective screen",
    "faulty screen",
    "screen fix",
    "lcd repair",
    "led repair",
    "panel replacement",
    "panel repair",
]

REPAIR_KEYWORDS_TH = [
    "ซ่อมจอ",
    "เปลี่ยนจอ",
    "ซ่อมหน้าจอ",
    "จอแตก",
    "จอเสีย",
    "ค่าซ่อม",
    "เปลี่ยนหน้าจอ",
    "ค่าซ่อมจอ",
    "จอชำรุด",
    "ซ่อมแซมจอ",
]

ALL_REPAIR_KEYWORDS = REPAIR_KEYWORDS_EN + REPAIR_KEYWORDS_TH

# ─────────────────────────────────────────────────────────────────────
# T&C BOUNDARY MARKERS — stop scanning line items when we hit these
# ─────────────────────────────────────────────────────────────────────
TC_BOUNDARIES = [
    "terms of payment",
    "terms and condition",
    "terms & condition",
    "additional",
    "excluded details",
    "condition",
    "educational training",
    "support service",
    "software license",
    "monthly ordering cycle",
    "shipment",
    "confirmation company",
    "we hereby acknowledge",
    "thank you for your business",
    # Thai
    "เงื่อนไข",
    "ข้อกำหนด",
    "การชำระเงิน",
]

# ─────────────────────────────────────────────────────────────────────
# FIELD EXTRACTION HELPERS
# ─────────────────────────────────────────────────────────────────────

def extract_line_items_text(full_text: str) -> str:
    """Return only the portion of text ABOVE the T&C boilerplate."""
    lines = full_text.split("\n")
    cutoff = len(lines)
    for i, line in enumerate(lines):
        line_lower = line.strip().lower()
        for marker in TC_BOUNDARIES:
            if marker in line_lower and len(line.strip()) < 120:
                cutoff = i
                break
        if cutoff != len(lines):
            break
    return "\n".join(lines[:cutoff])


def extract_quote_number(full_text: str) -> str:
    """Extract quotation/quote number (e.g., GP026)."""
    patterns = [
        r'(?:quotation|quote)\s*#?\s*:?\s*([A-Z]{1,5}\d{3,})',
        r'(?:quotation|quote)\s*(?:number|no\.?|#)\s*:?\s*(\S+)',
        r'(GP\d{3,})',
        r'(\d{11,}-\d+)',  # HubSpot-style IDs like 20260504-120234237
    ]
    for pat in patterns:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ""


def extract_date(full_text: str) -> str:
    """Extract the quotation/order date."""
    patterns = [
        r'(?:DATE|Date)\s*:?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
        r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})',
        r'(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})',
    ]
    for pat in patterns:
        m = re.search(pat, full_text)
        if m:
            return m.group(1).strip()
    return ""


def extract_customer(full_text: str) -> str:
    """Extract customer/company name."""
    lines = full_text.split("\n")

    # Strategy 1: find "Customer Company Name" header, then scan next few lines
    # for a company name (the layout may interleave other columns)
    for i, line in enumerate(lines):
        if re.search(r'customer\s*company\s*name', line, re.IGNORECASE):
            for j in range(i+1, min(i+6, len(lines))):
                candidate = lines[j].strip()
                if re.search(r'(Co\.,?\s*Lt|Corporation|Inc\.|Pte\s*Ltd|Company|Group|บริษัท)', candidate, re.IGNORECASE):
                    return re.sub(r'\s+', ' ', candidate)
            break

    # Strategy 2: look for common patterns
    patterns = [
        r'(?:Bill\s*To|Client)\s*:?\s*\n?\s*(.+?(?:Co\.|Ltd|Inc|Pte|Group).+?)(?:\n)',
    ]
    for pat in patterns:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m:
            return re.sub(r'\s+', ' ', m.group(1).strip())
    return ""


def extract_project(full_text: str) -> str:
    """Extract project/brand name (e.g., KFC, Boost Juice)."""
    # Check for known brand names first
    brands = [
        "KFC", "Boost Juice", "Mister Donut", "Pizza Hut",
        "Starbucks", "McDonald", "Auntie Anne", "Copperwired",
        "Mos Burger", "Tim Hortons", "Taco Bell", "Burger King",
    ]
    for brand in brands:
        if brand.lower() in full_text.lower():
            return brand

    # Then try explicit project field
    m = re.search(r'(?:Project|Brand)\s*:?\s*(.+)', full_text, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return ""


def extract_location(full_text: str) -> str:
    """Extract store/branch location."""
    patterns = [
        r'(?:Location|สาขา)\s*:?\s*\n?\s*(.+)',
        r'(KFC\s+สาขา\s*.+?)(?:\n|\()',
        r'\[?\s*(\d{4,5})\s*\]?\s*(.+?)(?:\n|$)',
    ]
    for pat in patterns:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m:
            loc = m.group(0).strip()
            loc = re.sub(r'\s+', ' ', loc)
            return loc[:120]
    return ""


def extract_currency(full_text: str) -> str:
    """Detect currency from the document."""
    text_lower = full_text.lower()
    if "฿" in full_text or "thb" in text_lower or "baht" in text_lower:
        return "THB"
    if "$" in full_text or "usd" in text_lower:
        return "USD"
    if "sgd" in text_lower:
        return "SGD"
    if "myr" in text_lower or "rm" in text_lower:
        return "MYR"
    return ""


def extract_repair_line_items(line_items_text: str, keywords_found: list) -> list:
    """
    Extract price and quantity from the line items area near the keyword match.
    Returns list of dicts: [{price_per_screen, qty, keyword, context}]
    """
    results = []
    lines = line_items_text.split("\n")

    for kw in keywords_found:
        for i, line in enumerate(lines):
            if kw.lower() in line.lower():
                # Grab surrounding context (the line + next 2 lines)
                context_lines = lines[max(0, i-1): min(len(lines), i+4)]
                context = " ".join(l.strip() for l in context_lines)

                # Look for prices in context
                prices = re.findall(
                    r'(?:฿|THB|USD|\$|RM|SGD)?\s*([\d,]+(?:\.\d{2})?)',
                    context
                )
                # Filter out small numbers that are likely quantities
                price_candidates = []
                for p in prices:
                    try:
                        val = float(p.replace(",", ""))
                        if val >= 100:
                            price_candidates.append(p)
                    except ValueError:
                        pass

                # Look for quantity
                qty_match = re.search(r'(?:qty|quantity|จำนวน)\s*:?\s*(\d+)', context, re.IGNORECASE)
                if not qty_match:
                    qty_match = re.search(r'^\s*(\d{1,3})\s', context)

                results.append({
                    "price_per_screen": price_candidates[0] if price_candidates else "",
                    "qty": qty_match.group(1) if qty_match else "",
                    "keyword": kw,
                    "context": context[:200],
                })
                break  # one match per keyword

    return results


def has_price_nearby(text: str, keyword: str) -> bool:
    """Check if keyword appears near a price/amount."""
    pos = text.lower().find(keyword.lower())
    if pos == -1:
        return False
    window = text[max(0, pos - 150): pos + len(keyword) + 150]
    return bool(re.search(r'(฿|THB|USD|baht|\$|SGD|MYR|\d{1,3}(,\d{3})+(\.\d{2})?)', window, re.IGNORECASE))


# ─────────────────────────────────────────────────────────────────────
# OCR FALLBACK
# ─────────────────────────────────────────────────────────────────────

def ocr_pdf(filepath: str) -> str:
    """OCR a scanned PDF using pytesseract. Returns extracted text."""
    try:
        from PIL import Image
        import pytesseract
    except ImportError:
        return "[OCR_UNAVAILABLE]"

    doc = fitz.open(filepath)
    all_text = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        text = pytesseract.image_to_string(img, lang="eng+tha")
        all_text.append(text)
    return "\n".join(all_text)


# ─────────────────────────────────────────────────────────────────────
# MAIN SCANNER
# ─────────────────────────────────────────────────────────────────────

def scan_pdf(filepath: str) -> dict:
    """Scan a single PDF and return extracted data."""
    filename = os.path.basename(filepath)
    result = {
        "file": filename,
        "status": "NO_MATCH",
        "quote_number": "",
        "quote_source": "PDF Scan",
        "quote_date": "",
        "customer": "",
        "project": "",
        "location": "",
        "price_per_screen": "",
        "currency": "",
        "qty": "",
        "keywords_found": "",
        "context": "",
    }

    try:
        doc = fitz.open(filepath)
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        doc.close()
    except Exception as e:
        result["status"] = f"ERROR: {e}"
        return result

    # Check if scanned (very little extractable text)
    if len(full_text.strip()) < 50:
        full_text = ocr_pdf(filepath)
        if full_text == "[OCR_UNAVAILABLE]":
            result["status"] = "NEEDS_OCR"
            return result
        result["quote_source"] = "PDF Scan (OCR)"

    # Extract metadata from FULL text
    result["quote_number"] = extract_quote_number(full_text)
    result["quote_date"] = extract_date(full_text)
    result["customer"] = extract_customer(full_text)
    result["project"] = extract_project(full_text)
    result["location"] = extract_location(full_text)
    result["currency"] = extract_currency(full_text)

    # Search for repair keywords ONLY in the line items area
    line_items_text = extract_line_items_text(full_text)
    text_lower = line_items_text.lower()

    matches = [kw for kw in ALL_REPAIR_KEYWORDS if kw in text_lower]

    if not matches:
        return result

    # Confirm matches have price context (not just a stray mention)
    confirmed = [kw for kw in matches if has_price_nearby(line_items_text, kw)]
    possible = [kw for kw in matches if kw not in confirmed]

    if confirmed:
        result["status"] = "MATCH"
        result["keywords_found"] = "; ".join(confirmed)
        items = extract_repair_line_items(line_items_text, confirmed)
        if items:
            result["price_per_screen"] = items[0]["price_per_screen"]
            result["qty"] = items[0]["qty"]
            result["context"] = items[0]["context"]
    elif possible:
        result["status"] = "POSSIBLE"
        result["keywords_found"] = "; ".join(possible)
        items = extract_repair_line_items(line_items_text, possible)
        if items:
            result["context"] = items[0]["context"]

    return result


def main():
    parser = argparse.ArgumentParser(description="Scan PDF quotations for screen repair line items")
    parser.add_argument("pdf_folder", help="Path to folder containing PDF files")
    parser.add_argument("-o", "--output", default="screen_repair_scan_results.csv", help="Output CSV path")
    parser.add_argument("--matches-only", action="store_true", help="Only output rows with MATCH or POSSIBLE status")
    args = parser.parse_args()

    if not os.path.isdir(args.pdf_folder):
        print(f"Error: '{args.pdf_folder}' is not a valid directory.")
        sys.exit(1)

    pdf_files = sorted([
        f for f in os.listdir(args.pdf_folder)
        if f.lower().endswith(".pdf")
    ])
    print(f"Found {len(pdf_files)} PDF files to scan.")

    # ── CSV matching the user's existing spreadsheet format ──
    csv_columns = [
        "Quote Number",
        "Quote Source",
        "Quote Issued Date",
        "Customer",
        "Project",
        "Screen Repair Location(s)",
        "Price per screen",
        "Currency",
        "Qty of repaired screens",
        # Extra diagnostic columns (can be removed for final output)
        "Match Status",
        "Keywords Found",
        "Context Snippet",
        "Source File",
    ]

    results = []
    match_count = 0
    possible_count = 0
    ocr_count = 0
    error_count = 0

    for i, filename in enumerate(pdf_files, 1):
        filepath = os.path.join(args.pdf_folder, filename)
        if i % 50 == 0 or i == 1:
            print(f"  Scanning {i}/{len(pdf_files)}: {filename}")

        r = scan_pdf(filepath)

        if r["status"] == "MATCH":
            match_count += 1
        elif r["status"] == "POSSIBLE":
            possible_count += 1
        elif r["status"] == "NEEDS_OCR":
            ocr_count += 1
        elif r["status"].startswith("ERROR"):
            error_count += 1

        if args.matches_only and r["status"] not in ("MATCH", "POSSIBLE"):
            continue

        results.append({
            "Quote Number": r["quote_number"],
            "Quote Source": r["quote_source"],
            "Quote Issued Date": r["quote_date"],
            "Customer": r["customer"],
            "Project": r["project"],
            "Screen Repair Location(s)": r["location"],
            "Price per screen": r["price_per_screen"],
            "Currency": r["currency"],
            "Qty of repaired screens": r["qty"],
            "Match Status": r["status"],
            "Keywords Found": r["keywords_found"],
            "Context Snippet": r["context"],
            "Source File": r["file"],
        })

    # Write CSV
    with open(args.output, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=csv_columns)
        writer.writeheader()
        writer.writerows(results)

    # Summary
    print(f"\n{'='*50}")
    print(f"SCAN COMPLETE")
    print(f"{'='*50}")
    print(f"  Total PDFs scanned:  {len(pdf_files)}")
    print(f"  MATCH (confirmed):   {match_count}")
    print(f"  POSSIBLE (review):   {possible_count}")
    print(f"  Needs OCR:           {ocr_count}")
    print(f"  Errors:              {error_count}")
    print(f"  No match:            {len(pdf_files) - match_count - possible_count - ocr_count - error_count}")
    print(f"\n  Output: {args.output}")


if __name__ == "__main__":
    main()