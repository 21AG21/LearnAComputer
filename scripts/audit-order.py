#!/usr/bin/env python3
"""Report on the shape of the curriculum: does the order make sense?

A report, not a build gate — several of the things it flags are deliberate, and
the point is to make a human look, not to fail CI. Run it after adding or moving
lessons:

    python3 scripts/audit-order.py

It answers four questions:

1. Does a lesson use a simulator before the unit that teaches that simulator?
2. Do two modules interleave in the global order?
3. Is any module long enough to be a fatigue cliff?
4. Is there room left to insert a lesson between modules?
"""

import json
import pathlib
import re
import sys
from collections import Counter, defaultdict

ROOT = pathlib.Path(__file__).resolve().parent.parent
LESSONS = ROOT / "content" / "lessons"

# The unit that formally teaches each simulator. A lesson using one of these
# earlier is not automatically wrong — Unit 2 types into four apps on purpose,
# because typing needs somewhere real to type — but it owes the learner a
# sentence saying "you will learn this app properly later".
TEACHES = {
    "guided-desktop": "Unit 1",
    "open-all-apps": "Unit 1",
    "guided-troubleshooting": "Unit 1",
    "notes-shortcut": "Unit 2",
    "type-text": "Unit 2",
    "edit-text": "Unit 2",
    "keyboard-shortcut": "Unit 2",
    "keyboard-nav-game": "Unit 2",
    "guided-files": "Unit 3",
    "edit-file": "Unit 3",
    "file-explorer-open": "Unit 3",
    "guided-browser": "Unit 4",
    "url-navigator": "Unit 4",
    "browser-right-click": "Unit 1",
    "browser-scroll-code": "Unit 1",
    "pinch-zoom": "Unit 1",
    "guided-messaging": "Unit 5",
    "message-reply": "Unit 5",
    "guided-email": "Unit 6",
    "compose-email": "Unit 6",
    "guided-photos": "Unit 7",
    "guided-app-store": "Unit 8",
    "guided-settings": "Unit 9",
    "guided-security": "Unit 10",
    "spot-the-fake": "Unit 10",
    "guided-calendar": "Unit 12",
}

# Long modules that are deliberate, with the reason. Keeps the report quiet about
# settled decisions instead of re-raising them every run.
LONG_MODULE_OK: dict[str, str] = {
    "What is a computer?": "8 of 9 are read-and-continue explainers; the sitting is minutes, not steps",
    "Documents and Printing": "6 of 9 are explainers; slated to gain guided activities, revisit when it does",
}

MAX_MODULE = 8


def unit_number(unit: str) -> int:
    m = re.search(r"(\d+)", unit)
    if m:
        return int(m.group(1))
    return 99  # "Final Assessment" and anything else unnumbered sorts last


def main() -> int:
    lessons = []
    for path in sorted(LESSONS.glob("*.json")):
        with path.open() as fh:
            lessons.append(json.load(fh))
    lessons.sort(key=lambda l: l["order"])

    notes: list[str] = []

    # --- 1. A simulator used before the unit that teaches it -----------------
    print("== Simulators used before the unit that teaches them ==")
    early = []
    for lesson in lessons:
        task_type = lesson["playgroundTask"]["type"]
        owner = TEACHES.get(task_type)
        if not owner:
            continue
        if unit_number(lesson["unit"]) < unit_number(owner):
            early.append((lesson["order"], lesson["slug"], task_type, lesson["unit"], owner))
    if early:
        for order, slug, task_type, unit, owner in early:
            print(f"  {order:>5}  {slug:<34} {task_type:<20} in {unit} (taught in {owner})")
        print(
            "\n  Not automatically a defect. Each of these must carry one sentence in its\n"
            "  intro telling the learner the app comes later, and must demand no navigation\n"
            "  the highlight does not perform for them."
        )
    else:
        print("  None.")

    # --- 2. Modules that interleave in the global order ---------------------
    print("\n== Modules that interleave ==")
    ranges: dict[tuple[str, str], list[int]] = defaultdict(list)
    for lesson in lessons:
        ranges[(lesson["unit"], lesson["module"])].append(lesson["order"])
    spans = sorted(((min(v), max(v), k) for k, v in ranges.items()))
    overlaps = []
    for i in range(len(spans) - 1):
        lo, hi, key = spans[i]
        nlo, nhi, nkey = spans[i + 1]
        if nlo <= hi:
            overlaps.append((key, (lo, hi), nkey, (nlo, nhi)))
    if overlaps:
        for a, ar, b, br in overlaps:
            print(f"  {a[1]!r} {ar} overlaps {b[1]!r} {br}")
    else:
        print("  None — every module owns a contiguous block.")

    # --- 3. Module length ----------------------------------------------------
    print(f"\n== Modules longer than {MAX_MODULE} sub-lessons ==")
    sizes = Counter((l["unit"], l["module"]) for l in lessons)
    long_ones = [(n, k) for k, n in sizes.items() if n > MAX_MODULE]
    if long_ones:
        for n, key in sorted(long_ones, reverse=True):
            why = LONG_MODULE_OK.get(key[1])
            tail = f"  (accepted: {why})" if why else ""
            print(f"  {n:>3} sub-lessons  {key[0]} / {key[1]}{tail}")
        print(
            "\n  A module is one sitting. Past about eight steps the learner is being asked\n"
            "  for more attention than a first session has in it."
        )
    else:
        print("  None.")

    # --- 4. Headroom between modules ----------------------------------------
    print("\n== Gaps too small to insert a module into ==")
    tight = []
    for i in range(len(spans) - 1):
        _, hi, key = spans[i]
        nlo, _, nkey = spans[i + 1]
        if 0 <= nlo - hi <= 2 and key[0] == nkey[0]:
            tight.append((key[1], hi, nkey[1], nlo))
    if tight:
        for a, hi, b, nlo in tight:
            print(f"  {a!r} ends at {hi}, {b!r} starts at {nlo}")
    else:
        print("  None — every module boundary has room.")

    # --- Summary -------------------------------------------------------------
    print("\n== Unit spans ==")
    unit_span: dict[str, list[int]] = defaultdict(list)
    for lesson in lessons:
        unit_span[lesson["unit"]].append(lesson["order"])
    prev_hi = -1
    for unit in sorted(unit_span, key=lambda u: min(unit_span[u])):
        lo, hi = min(unit_span[unit]), max(unit_span[unit])
        flag = "  <-- starts below the previous unit's end" if lo < prev_hi else ""
        print(f"  {lo:>5}-{hi:<5} {len(unit_span[unit]):>3} lessons  {unit}{flag}")
        prev_hi = hi

    print(f"\n{len(lessons)} lessons, {len(ranges)} modules, {len(unit_span)} units.")
    for note in notes:
        print(note)
    return 0


if __name__ == "__main__":
    sys.exit(main())
