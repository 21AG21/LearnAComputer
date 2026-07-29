#!/usr/bin/env python3
"""Does the sales material describe the product that exists?

Deleting a feature is not done when the code is gone. Accounts, sign-in and
cross-device sync came out on 2026-07-28; the sales documents were rewritten the
same day but not completely, and for a day the section of the playbook headed
"never claim what isn't shipped" listed "accounts with email-code sign-in" under
*Shipped and demo-safe*. Four other places told a caller to promise sign-in.

Nobody re-runs a harness against prose, so this is that harness. It fails when a
sales-facing document promises something the code no longer contains.

    python3 scripts/pitch-check.py

NEGATIVE CONTROL: add the words "learners can sign in to save progress" to
docs/SALES_PLAYBOOK.md and re-run. It must fail and quote the line.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Sales-facing only. Planning and audit docs are allowed to discuss history.
DOCS = [
    "docs/SALES_PLAYBOOK.md",
    "docs/COLD_CALL_KIT.md",
    "docs/DEMO_PRIYA_ELDER_CARE.md",
    "docs/IMPLEMENTATION_GUIDE.md",
]

# A phrase that promises a capability, and the proof it is gone. Each pattern is
# deliberately narrow: these documents must be able to say "there is no sign-in".
FORBIDDEN = [
    (r"\bsigning in\b(?![^.]*\bno\b)", "promises sign-in; there is none"),
    (r"should\s+\*\*sign in\*\*|learners\s+should\s+sign\s+in", "tells learners to sign in"),
    (r"accounts?\s+with\s+email", "claims email accounts"),
    (r"\bsign-?out\b", "refers to signing out"),
    (r"cross-(machine|device)\s+(progress|sync)", "claims progress follows a learner"),
    (r"our accounts require", "claims the product has accounts"),
    (r"under-13 accounts", "claims child accounts are a roadmap item"),
    (r"\bSupabase\b", "names a dependency that was removed"),
    (r"@vercel/analytics|Vercel Analytics", "names analytics that were removed"),
]

# A mention inside a removal note is exactly what these docs SHOULD contain —
# "Removed on purpose … accounts and sign-in, cross-device progress sync" is the
# line that stops a caller offering to build it back. Only a line that reads as a
# promise counts.
ALLOWED_CONTEXT = re.compile(
    r"removed|no longer|not coming back|cancelled|canceled|do not offer|do not claim|"
    r"never claim|there is no|there are no|nothing to sign|none of it exists|"
    r"does not exist|deleted|was taken out|never to say|not shipped",
    re.I,
)


def excused(lines, i):
    """True when the surrounding two lines frame this as something that is gone."""
    window = lines[max(0, i - 3) : i + 1]
    return any(ALLOWED_CONTEXT.search(l) for l in window)


# How many activities a machine actually plays. The playbook quotes this number
# ("159 of the 170 activities mechanically proven finishable") and it went stale
# for months as "150" — nobody re-derives a sentence. Derived here from the same
# two sets the solver uses, so the pitch cannot drift from the harness again.
def _solver_set(name: str) -> set:
    """Read a set literal out of lib/solve/solver.ts.

    Hand-copied here first, and it drifted inside a single commit: the solver
    grew a type, the copy did not, and the check reported 159 while the playbook
    said 163. A guard that needs a second edit to stay honest is a guard that
    will one day lie. `check-lessons.py` already reads photo labels and app names
    straight out of the components for the same reason — this follows it.

    The `\b` matters. Without it, `STEPLESS` also matched `STEPLESS_RENAMED`,
    so renaming the constant in the solver left this reading the renamed one and
    reporting success — which the rename control caught, one minute after this
    function was written.
    """
    src = (ROOT / "lib" / "solve" / "solver.ts").read_text()
    m = re.search(rf"(?:const|export const)\s+{name}\b[^=]*=\s*(?:new Set\()?\[(.*?)\]", src, re.S)
    if not m:
        raise SystemExit(f"pitch-check: cannot find {name} in lib/solve/solver.ts — did it move?")
    return set(re.findall(r'"([^"]+)"', m.group(1)))


def _solver_exempt_keys() -> set:
    """EXEMPT is an object literal, not an array: read its keys."""
    src = (ROOT / "lib" / "solve" / "solver.ts").read_text()
    m = re.search(r"export const EXEMPT: Record<string, string> = \{(.*?)\n\};", src, re.S)
    if not m:
        raise SystemExit("pitch-check: cannot find EXEMPT in lib/solve/solver.ts — did it move?")
    body = m.group(1)
    return set(re.findall(r'^\s*"?([a-z-]+)"?\s*:', body, re.M))


SOLVER_EXEMPT = _solver_exempt_keys()
SOLVER_STEPLESS = _solver_set("STEPLESS")


def proven():
    """(machine-proven, queued) — the numerator and denominator the pitch quotes."""
    import json
    played = missions = 0
    queued = 0
    for f in (ROOT / "content" / "lessons").glob("*.json"):
        t = json.loads(f.read_text())["playgroundTask"]
        if t["type"] in ("none", "placeholder"):
            continue
        queued += 1
        if t["type"] == "real-world":
            missions += 1
        elif t["type"] in SOLVER_EXEMPT:
            pass
        elif (isinstance(t.get("steps"), list) and t["steps"]) or t["type"] in SOLVER_STEPLESS:
            played += 1
    return played + missions, queued


# Claims of scale that must match what is on disk.
def counts():
    lessons = list((ROOT / "content" / "lessons").glob("*.json"))
    import json
    units, missions = set(), 0
    for f in lessons:
        d = json.loads(f.read_text())
        units.add(d["unit"])
        if d["playgroundTask"]["type"] == "real-world":
            missions += 1
    return len(lessons), len(units), missions


def main() -> int:
    errors = []

    n_lessons, n_units, n_missions = counts()
    for rel in DOCS:
        p = ROOT / rel
        if not p.exists():
            errors.append(f"{rel}: referenced by the pitch but missing")
            continue
        text = p.read_text()
        lines = text.splitlines()
        for i, line in enumerate(lines, 1):
            if excused(lines, i - 1):
                continue
            for pat, why in FORBIDDEN:
                if re.search(pat, line, re.I):
                    errors.append(f"{rel}:{i}: {why}\n    {line.strip()[:120]}")
        # Every doc a salesperson is pointed at must exist.
        for ref in re.findall(r"`(docs/[A-Za-z0-9_./-]+\.md)`", text):
            if not (ROOT / ref).exists():
                errors.append(f"{rel}: points at {ref}, which does not exist")
        # Scale claims.
        n_proven, n_queued = proven()
        for num, real, what in (
            (r"(\d+)\s+hands-on lessons", n_lessons, "lessons"),
            (r"(\d+)\s+units\b", n_units, "units"),
            (r"all\s+(\d+)\s+real-world missions", n_missions, "missions"),
            (r"\*\*(\d+)\s+of the \d+ activities", n_proven, "machine-proven activities"),
            (r"\*\*\d+\s+of the (\d+) activities", n_queued, "queued activities"),
        ):
            for m in re.finditer(num, text):
                if int(m.group(1)) != real:
                    errors.append(f"{rel}: says {m.group(1)} {what}, there are {real}")

    if errors:
        print(f"{len(errors)} problem(s) — the pitch describes a product that does not exist:\n")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"The pitch matches the product ({n_lessons} lessons, {n_units} units, {n_missions} missions).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
