#!/usr/bin/env python3
"""Build public/missions/messy-folder.zip — the folder the learner sorts for real.

Every file is a genuine file of its type: the JPEGs open in a photo viewer, the
PDFs open in a PDF reader, the CSV opens in a spreadsheet. A zip of empty
placeholders would fall apart the moment someone double-clicked one, and the
whole point of the mission is that they open things to find out what they are.

Run from the repo root:  python3 scripts/make-mission-folder.py
"""

import io
import os
import zipfile
from PIL import Image, ImageDraw

OUT = "public/missions/messy-folder.zip"


# ── PDF ─────────────────────────────────────────────────────────────────────
def pdf_bytes(lines, title_size=18):
    """A one-page PDF with a bold-ish title and body lines, built by hand.

    No dependency does this for us, and the file has to be a real PDF: the
    learner is told to open scan0001.pdf and name it after what they see.
    """
    content = ["BT", f"/F1 {title_size} Tf", "72 760 Td", f"({lines[0]}) Tj", "ET"]
    y = 720
    for line in lines[1:]:
        content += ["BT", "/F1 12 Tf", f"72 {y} Td", f"({line}) Tj", "ET"]
        y -= 20
    stream = "\n".join(content).encode("latin-1")

    objs = [
        b"<</Type/Catalog/Pages 2 0 R>>",
        b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R"
        b"/Resources<</Font<</F1 5 0 R>>>>>>",
        b"<</Length %d>>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + body + b"\nendobj\n"

    xref_at = len(out)
    out += b"xref\n0 %d\n" % (len(objs) + 1)
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += b"%010d 00000 n \n" % off
    out += b"trailer\n<</Size %d/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref_at)
    return bytes(out)


# ── Images ──────────────────────────────────────────────────────────────────
def image_bytes(kind, fmt="JPEG", size=(640, 426)):
    """Small but real pictures — recognizable enough to sort at a glance."""
    img = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(img)
    w, h = size

    if kind == "beach":
        d.rectangle([0, 0, w, h * 0.55], fill=(126, 184, 224))
        d.ellipse([w * 0.7, h * 0.08, w * 0.86, h * 0.32], fill=(252, 226, 138))
        d.rectangle([0, h * 0.55, w, h * 0.72], fill=(60, 130, 160))
        d.rectangle([0, h * 0.72, w, h], fill=(226, 205, 160))
        for i in range(6):
            d.arc([w * 0.05 + i * w * 0.16, h * 0.6, w * 0.17 + i * w * 0.16, h * 0.68], 200, 340, fill="white", width=3)
    elif kind == "garden":
        d.rectangle([0, 0, w, h * 0.45], fill=(198, 219, 232))
        d.rectangle([0, h * 0.45, w, h], fill=(104, 142, 92))
        for cx, cy, r in [(120, 250, 30), (300, 300, 44), (470, 240, 26)]:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(214, 96, 84))
            d.line([cx, cy + r, cx, h], fill=(70, 110, 60), width=5)
    elif kind == "cake":
        d.rectangle([0, 0, w, h], fill=(238, 232, 224))
        d.ellipse([w * 0.22, h * 0.3, w * 0.78, h * 0.8], fill=(186, 138, 96))
        d.ellipse([w * 0.27, h * 0.27, w * 0.73, h * 0.55], fill=(240, 226, 210))
        for x in range(5):
            cx = w * 0.34 + x * w * 0.08
            d.line([cx, h * 0.2, cx, h * 0.36], fill=(200, 90, 90), width=6)
    elif kind == "screenshot":
        d.rectangle([0, 0, w, h], fill=(246, 247, 249))
        d.rectangle([0, 0, w, 34], fill=(222, 226, 232))
        for i in range(3):
            d.ellipse([12 + i * 18, 12, 24 + i * 18, 24], fill=(180, 186, 196))
        for row in range(9):
            d.rectangle([28, 60 + row * 34, 28 + (w - 120) * (0.5 + (row % 3) * 0.22), 74 + row * 34],
                        fill=(214, 219, 226))
        d.rectangle([w - 150, h - 70, w - 30, h - 30], fill=(80, 130, 220))

    buf = io.BytesIO()
    img.save(buf, fmt, quality=72) if fmt == "JPEG" else img.save(buf, fmt)
    return buf.getvalue()


# ── The folder ──────────────────────────────────────────────────────────────
BUDGET_CSV = (
    "Month,Rent,Food,Bus pass,Phone,Left over\n"
    "January,650,240,55,18,137\n"
    "February,650,228,55,18,149\n"
    "March,650,262,55,21,112\n"
    "April,650,251,55,21,123\n"
)

FILES = {
    # Photos
    "IMG_20250712_113045.jpg": image_bytes("garden"),
    "DSC_0043.jpg": image_bytes("cake"),
    "beach-day.jpg": image_bytes("beach"),
    "Screenshot 2025-07-12 at 14.22.08.png": image_bytes("screenshot", "PNG"),
    # Documents
    "Untitled document (2).txt": (
        "Things to ask the doctor\n\n"
        "- Is the new tablet meant to be taken with food?\n"
        "- Can I still walk the dog as far as the park?\n"
        "- When is the next blood test due?\n"
    ),
    "letter to the council FINAL final v2.txt": (
        "Dear Sir or Madam,\n\n"
        "I am writing about the streetlight outside number 14, which has been out\n"
        "since the middle of May. The pavement is very dark by the bus stop and a\n"
        "neighbor has already had a fall there.\n\n"
        "Yours faithfully,\n"
        "A. Resident\n"
    ),
    "book club notes.txt": (
        "Book club - 3rd Thursday\n\n"
        "Next book: the one about the lighthouse keeper\n"
        "Margaret is bringing the lemon cake\n"
        "Ask about moving to 7pm so Dev can get there after work\n"
    ),
    "holiday-packing-list.txt": (
        "Packing\n\nsun hat\ncharger AND the little adapter\ntravel insurance printout\n"
        "book\nthe good walking shoes, not the new ones\n"
    ),
    # Money
    "budget-2025.csv": BUDGET_CSV,
    "electricity bill march.pdf": pdf_bytes([
        "Northern Power - Electricity",
        "Billing period: 1 March to 31 March 2025",
        "Account: 4471 2280",
        "Units used: 240 kWh",
        "Amount due: 61.40",
        "Due date: 22 April 2025",
    ]),
    "receipt-kettle.pdf": pdf_bytes([
        "RECEIPT - Homeware Shop",
        "1 x Stainless steel kettle       24.99",
        "1 x Descaler sachets              3.50",
        "Total                            28.49",
        "Paid by card, 12 July 2025",
        "Returns accepted within 30 days with this receipt.",
    ]),
    # Renamed after opening: the name says nothing, the contents say everything.
    "scan0001.pdf": pdf_bytes([
        "COUNCIL TAX BILL",
        "Property: 14 Alder Road",
        "Year: 2025 to 2026",
        "Band: C",
        "Total for the year: 1,486.00",
        "Payable in 10 monthly instalments of 148.60",
        "First instalment due: 1 April 2025",
    ]),
    # Junk
    "Copy of Copy of Untitled.txt": "",
    "New Text Document.txt": "",
    "download (1).csv": BUDGET_CSV,  # byte-for-byte the same as budget-2025.csv
}


# Unit 4 downloads this and then has to go and find it again, so it needs a name
# nobody could confuse with anything else already in their Downloads folder.
PRACTICE_PDF = "public/missions/Downloads-Practice.pdf"
PRACTICE_LINES = [
    "You found it.",
    "This file exists for one reason: so that you could download it and then",
    "go and find it again on your own computer.",
    "",
    "A download is never lost. It is in a folder, and the folder has a name -",
    "usually Downloads. Your browser can tell you where it put this one:",
    "look in its downloads list, and it will show you the folder.",
    "",
    "That is the whole trick. Nothing on a computer disappears; it is just",
    "somewhere you have not looked yet.",
]


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in FILES.items():
            z.writestr(f"messy-folder/{name}", data if isinstance(data, bytes) else data.encode("utf-8"))
    print(f"{OUT}  {len(FILES)} files  {os.path.getsize(OUT) / 1024:.0f} KB")

    with open(PRACTICE_PDF, "wb") as f:
        f.write(pdf_bytes(PRACTICE_LINES))
    print(f"{PRACTICE_PDF}  {os.path.getsize(PRACTICE_PDF) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
