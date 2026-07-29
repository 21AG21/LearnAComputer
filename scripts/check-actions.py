#!/usr/bin/env python3
"""Every action a sim advertises must be one a learner can actually complete.

    python3 scripts/check-actions.py

The hole this closes: `open-app` was a *documented* App Market action with no
handler behind it. It had a highlight case, so it looked wired up, but nothing
ever called `tryStep` for it — a step using it would have left the learner
staring at a screen with nothing to click.

No harness could see it. solve-check only plays lessons that exist, and no
lesson used it; check-lessons.py validates targets against the sim, and the app
name was real. The bug was not in the code that runs, it was in the menu of
things an author is invited to write next. Two unfinishable lessons have
shipped from this project before, and this is the same shape one step earlier.

So: for each guided sim, take the action union from its TypeScript step type,
and take the actions that some `tryStep` / `wanted` / `wants` predicate can
actually satisfy. Anything in the first set and not the second is a trap.
"""
import glob
import os
import re
import sys

# Actions that are deliberately declared but satisfied somewhere other than a
# predicate in the same file. Each needs a reason, or it is a bug in disguise.
ALLOW = {
    # Reported by the desktop shell rather than the sim's own handlers.
    ("GuidedDesktopTask.tsx", "move"),
    ("GuidedDesktopTask.tsx", "resize"),
}

def strip_comments(src: str) -> str:
    """Comments break the union scan, and a half-read union is worse than none.

    Found by a negative control: reintroducing `open-app` was NOT caught,
    because a comment sitting inside the union stopped the match early and the
    rest of the union was never read. A check that quietly inspects half of
    what it claims to inspect is the most dangerous kind.
    """
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"//[^\n]*", "", src)


def union_actions(src: str) -> set[str]:
    """The `action:` union out of the step type."""
    m = re.search(r"\baction\s*:\s*((?:\s*\|?\s*\"[a-z0-9-]+\"\s*)+);", src)
    if not m:
        return set()
    return set(re.findall(r'"([a-z0-9-]+)"', m.group(1)))


def predicate_windows(src: str):
    for call in re.finditer(r"\b(tryStep|wanted|wants)\s*\(", src):
        yield src[call.end(): call.end() + 400]


def uses_indirection(src: str) -> bool:
    """Does some predicate compare `.action` to a variable rather than a literal?

    GuidedEmailTask does: it looks the action up in a FIELD_ACTION map, so
    `set-to` is reachable without the string ever appearing beside `.action ===`.
    Reading through that needs a real TypeScript parser. Rather than guess — and
    rather than cry wolf, which is how a check gets ignored — say so out loud.
    """
    for window in predicate_windows(src):
        if re.search(r"\.action\s*(?:===|!==)\s*[A-Za-z_$]", window):
            return True
    return False


def reachable_actions(src: str) -> set[str]:
    """Actions some step-runner predicate can satisfy.

    Only the windows following tryStep/wanted/wants count. A `case "x":` in the
    highlight switch does not — that is exactly what made `open-app` look
    connected while being unreachable.
    """
    found: set[str] = set()
    for window in predicate_windows(src):
        found |= set(re.findall(r'\.action\s*===\s*"([a-z0-9-]+)"', window))
        # `s.action === (up ? "favorite" : "unfavorite")` — one handler, two
        # directions. Both are genuinely reachable.
        for grp in re.finditer(r"\.action\s*===\s*\(([^)]*)\)", window):
            found |= set(re.findall(r'"([a-z0-9-]+)"', grp.group(1)))
        for arr in re.finditer(r"\[([^\]]*)\]\s*\.includes\(\s*\w+\.action", window):
            found |= set(re.findall(r'"([a-z0-9-]+)"', arr.group(1)))
        # Multi-line predicates guard with an early return:
        #   tryStep((s) => { if (s.action !== "search") return false; … })
        # Counting these can theoretically forgive an exclusion guard
        # (`s.action !== "type" && …`), but in that shape the excluded action is
        # always handled elsewhere. Missing a real bug is the lesser risk here:
        # a check that reports things that are fine is a check people stop
        # reading, and then it catches nothing at all.
        found |= set(re.findall(r'\.action\s*!==\s*"([a-z0-9-]+)"', window))
    return found


problems = []
checked = 0
skipped = []

for path in sorted(glob.glob("components/Playground/*.tsx")):
    src = strip_comments(open(path).read())
    if "useStepRunner" not in src:
        continue
    declared = union_actions(src)
    if not declared:
        continue
    name = os.path.basename(path)
    if uses_indirection(src):
        skipped.append(name)
        continue
    checked += 1
    reachable = reachable_actions(src)
    for action in sorted(declared - reachable):
        if (name, action) in ALLOW:
            continue
        problems.append((path, action))

if skipped:
    print("Not statically checkable (a predicate dispatches on a variable):")
    for name in skipped:
        print(f"  {name}")
    print("  — those sims are covered by solve-check playing their real lessons.\n")

if problems:
    print(f"{len(problems)} action(s) a lesson could ask for and never finish:\n")
    for path, action in problems:
        print(f'  {path}  declares "{action}" but no tryStep predicate can satisfy it')
    print("\nEither wire it up, or remove it from the union and from CLAUDE.md.")
    print("An action nobody can complete is an unfinishable lesson waiting to be written.")
    sys.exit(1)

print(f"Every action declared by {checked} sims can actually be completed.")
