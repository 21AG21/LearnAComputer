#!/usr/bin/env python3
"""Validate lesson JSON: orders, capitalization, banned types, ungiven values."""

import json
import glob
import re
import sys
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

errors = []

lessons = []
for f in sorted(glob.glob("content/lessons/*.json")):
    with open(f) as fh:
        data = json.load(fh)
    data["_file"] = f
    lessons.append(data)

# 1. Unique orders
orders = {}
for les in lessons:
    order = les["order"]
    if order in orders:
        errors.append(f"ORDER COLLISION: {order} used by both '{orders[order]}' and '{les['slug']}'")
    orders[order] = les["slug"]

# 2. Capitalization: first character of learner-facing strings must be uppercase
fields_to_check = ["drDigitalIntro", "drDigitalSuccess", "drDigitalHint"]
for les in lessons:
    for field in fields_to_check:
        val = les.get(field, "")
        if val and val[0].islower():
            errors.append(f"CAPITALIZATION: {les['slug']}.{field} starts with '{val[0]}'")

    task = les.get("playgroundTask", {})
    instructions = task.get("instructions", "")
    if instructions and instructions[0].islower():
        errors.append(f"CAPITALIZATION: {les['slug']}.playgroundTask.instructions starts with '{instructions[0]}'")

    for i, step in enumerate(task.get("steps", [])):
        say = step.get("say", "")
        if say and say[0].islower():
            errors.append(f"CAPITALIZATION: {les['slug']} step {i+1} say starts with '{say[0]}'")

# 3. No banned task types
banned_types = {"multiple-choice", "placeholder"}
for les in lessons:
    task_type = les.get("playgroundTask", {}).get("type", "none")
    if task_type in banned_types:
        errors.append(f"BANNED TYPE: {les['slug']} uses '{task_type}'")

# ─── Every typed value must be given to the learner ──────────────────────────
# An objective that says "The bus timetable is on screen" while the only way to
# get there is recalling the fictional domain citytransit.example tests memory,
# not browsing. Anything the learner must TYPE or INVENT — a URL, a name, a
# search term, a time — has to appear either in the step's own `say` text or in
# the lesson brief. Targets they can point at on screen (an email subject, a
# photo label, an app tile) are exempt: those are discoverable by looking.
TYPED_VALUE_FIELD = {
    "navigate": "url", "new-folder": "value", "rename": "value", "search": "value",
    "save": "value", "create-album": "value", "add-to-album": "value",
    "go-to-album": "target", "set-title": "value", "set-reminder-text": "value",
    "set-time": "value", "set-repeat": "value", "select-day": "target",
    "set-to": "value", "set-cc": "value", "set-bcc": "value", "set-subject": "value",
    "set-body": "value", "send-message": "value", "send-group-message": "value",
    "type-username": "value",
}

# Sites reachable by clicking a tile on the browser's new-tab page. Keep in sync
# with FAVORITES in components/Playground/GuidedBrowserTask.tsx.
BROWSER_FAVORITES = {
    "shop.example", "google.com", "wikipedia.org", "weather.com", "dailynews.example",
    "recipebox.example", "citylibrary.example", "bookshop.example", "citytransit.example",
    "gardeningtips.example", "petnews.example", "firstbank.example", "support.example",
}

for les in lessons:
    task = les.get("playgroundTask", {})
    steps = task.get("steps") or []
    brief = " ".join([
        les.get("drDigitalIntro", ""), les.get("drDigitalHint", ""),
        task.get("hint", ""), task.get("goal", ""),
    ]).lower()
    for step in steps:
        field = TYPED_VALUE_FIELD.get(step.get("action"))
        if not field:
            continue
        value = step.get(field)
        # An empty value means "anything is accepted"; "any" is the literal wildcard.
        if not value or value == "any":
            continue
        if step["action"] == "navigate" and value in BROWSER_FAVORITES:
            continue
        if value.lower() in brief or value.lower() in step.get("say", "").lower():
            continue
        errors.append(
            f"UNGIVEN VALUE: {les['slug']} step '{step['action']}' needs {value!r}, "
            f"which appears in neither the step text nor the lesson brief"
        )

# ─── Real-world missions ─────────────────────────────────────────────────────
# The same rule as above, applied to the machine in front of the learner. A
# mission that checks for a folder called "Money" without ever saying the word
# "Money" is asking them to guess, and the failure would arrive at the very last
# step after twenty minutes of sorting. Anything the check compares by name —
# folder names, the junk files to delete, the file to rename, a named download —
# has to appear in the brief or in a step. Downloads must also actually exist.
for les in lessons:
    task = les.get("playgroundTask", {})
    if task.get("type") != "real-world":
        continue
    steps = task.get("steps") or []
    text = " ".join(
        [les.get("drDigitalIntro", ""), les.get("drDigitalHint", ""), task.get("goal", "")]
        + [s.get("say", "") + " " + s.get("detail", "") for s in steps]
    ).lower()

    def require(value, what):
        if value and value.lower() not in text:
            errors.append(f"UNGIVEN MISSION VALUE: {les['slug']} checks for {what} {value!r}, which the lesson never states")

    download = task.get("download")
    if download:
        path = os.path.join("public", "missions", download["file"])
        if not os.path.exists(path):
            errors.append(f"MISSING ASSET: {les['slug']} offers '{download['file']}' but {path} does not exist")

    for step in steps:
        expect = step.get("expect") or {}
        for folder in expect.get("folders", []):
            require(folder, "a folder called")
        for junk in expect.get("absent", []):
            require(junk, "the deletion of")
        if expect.get("renamed"):
            require(expect["renamed"].get("was"), "the renaming of")
        if (step.get("file") or {}).get("nameIs"):
            require(step["file"]["nameIs"], "the file")


# ---------------------------------------------------------------------------
# Every target a step names must exist in the simulator it names it to.
#
# Two lessons shipped with targets nothing in the sim matched: a WiFi network
# called "Cafe Guest" that was never in the list, and a calendar day named
# "Wednesday" checked against a grid of numbers. Both left the learner on a step
# that no click could ever complete — one of them in the final assessment. The
# sets below are read out of the components, so they cannot drift.
# ---------------------------------------------------------------------------

def _src(rel):
    with open(os.path.join("components", "Playground", rel), encoding="utf-8") as fh:
        return fh.read()

def _find(rel, pattern):
    return set(re.findall(pattern, _src(rel), re.M))

try:
    KNOWN = {
        ("guided-photos", "select-photo"): _find("GuidedPhotosTask.tsx", r'label: "([^"]+)",\s+src: photoSrc'),
        ("guided-photos", "delete"):       _find("GuidedPhotosTask.tsx", r'label: "([^"]+)",\s+src: photoSrc'),
        ("guided-photos", "recover"):      _find("GuidedPhotosTask.tsx", r'label: "([^"]+)",\s+src: photoSrc'),
        ("guided-photos", "favorite"):     _find("GuidedPhotosTask.tsx", r'label: "([^"]+)",\s+src: photoSrc'),
        ("guided-photos", "unfavorite"):   _find("GuidedPhotosTask.tsx", r'label: "([^"]+)",\s+src: photoSrc'),
        ("guided-app-store", "select-app"): _find("GuidedAppStoreTask.tsx", r'id: "\w+", name: "([^"]+)"'),
        ("guided-app-store", "install"):    _find("GuidedAppStoreTask.tsx", r'id: "\w+", name: "([^"]+)"'),
        ("guided-app-store", "delete-app"): _find("GuidedAppStoreTask.tsx", r'id: "\w+", name: "([^"]+)"'),
        ("guided-app-store", "update-app"): _find("GuidedAppStoreTask.tsx", r'id: "\w+", name: "([^"]+)"'),
        ("guided-messaging", "select-contact"): _find("GuidedMessagingTask.tsx", r'\{ id: "(\w+)", name: "\w+", avatar'),
        ("guided-messaging", "add-to-group"):   _find("GuidedMessagingTask.tsx", r'\{ id: "(\w+)", name: "\w+", avatar'),
        ("guided-security", "inspect-link"):    _find("GuidedSecurityTask.tsx", r'^  "([^"]+)": \{'),
        ("guided-security", "mark-safe"):       _find("GuidedSecurityTask.tsx", r'^  "([^"]+)": \{'),
        ("guided-security", "mark-dangerous"):  _find("GuidedSecurityTask.tsx", r'^  "([^"]+)": \{'),
        ("guided-settings", "open-section"):    _find("Desktop/SettingsApp.tsx", r'\{ id: "(\w+)", label: "[^"]+", icon:'),
        ("guided-troubleshooting", "join-network"): _find("GuidedTroubleshootingTask.tsx", r'PUBLIC_NETWORKS = \[PUBLIC_GUEST_NETWORK, "([^"]+)", "([^"]+)"') or set(),
        ("guided-calendar", "select-day"): {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"} | {str(n) for n in range(1, 32)},
    }
    # PUBLIC_NETWORKS is written with the guest network as a named constant.
    guest = _find("GuidedTroubleshootingTask.tsx", r'PUBLIC_GUEST_NETWORK = "([^"]+)"')
    decoys = set(re.findall(r'PUBLIC_NETWORKS = \[PUBLIC_GUEST_NETWORK, ([^\]]+)\]', _src("GuidedTroubleshootingTask.tsx")))
    KNOWN[("guided-troubleshooting", "join-network")] = guest | {
        d.strip().strip('"') for chunk in decoys for d in chunk.split(",")
    }
except (OSError, IndexError):
    KNOWN = {}

for les in lessons:
    task = les.get("playgroundTask") or {}
    ttype = task.get("type")
    for i, step in enumerate(task.get("steps") or []):
        if not isinstance(step, dict):
            continue
        allowed = KNOWN.get((ttype, step.get("action")))
        target = step.get("target")
        if allowed and target is not None and target not in allowed:
            errors.append(
                f"UNKNOWN TARGET: {les['slug']} step {i + 1} asks for "
                f"{ttype}.{step['action']} {target!r}, which the simulator does not have"
            )


# 8. Reading level. The audience reads at a middle-school level at best, and some
# read English as a second language. drDigitalIntro is the teaching text, so it is
# the string held to a grade. Above 8 is a warning (rewrite soon); above 10 the
# build fails — nobody in the target audience can comfortably read grade-10 prose.
warnings = []


def _syllables(word):
    word = word.lower().strip(".,!?;:'\"()-•")
    if not word:
        return 0
    groups = re.findall(r"[aeiouy]+", word)
    n = len(groups)
    if word.endswith("e") and n > 1:
        n -= 1
    return max(n, 1)


def _fk_grade(text):
    # A bullet is a sentence for reading purposes: it is read as one unit.
    sentences = [s for s in re.split(r"[.!?\n]+", text) if s.strip()]
    words = text.split()
    if not sentences or not words:
        return 0.0
    syl = sum(_syllables(w) for w in words)
    return 0.39 * (len(words) / len(sentences)) + 11.8 * (syl / len(words)) - 15.59


FK_WARN, FK_FAIL, INTRO_WARN_WORDS = 8.0, 10.0, 180

for les in lessons:
    intro = les.get("drDigitalIntro", "")
    grade = _fk_grade(intro)
    if grade > FK_FAIL:
        errors.append(
            f"READING LEVEL: {les['slug']} intro reads at grade {grade:.1f} (limit {FK_FAIL:.0f}) — shorter sentences, plainer words"
        )
    elif grade > FK_WARN:
        warnings.append(f"READING LEVEL: {les['slug']} intro reads at grade {grade:.1f} — aim for {FK_WARN:.0f} or below")
    if len(intro.split()) > INTRO_WARN_WORDS:
        warnings.append(f"INTRO LENGTH: {les['slug']} intro is {len(intro.split())} words — a wall of text for this audience")


# ── Every lesson without an activity must have a picture ────────────────────
#
# Not decoration. The lesson page puts the activity in the right-hand pane; a
# lesson with no activity puts a picture there instead. With neither, the pane
# collapses and the whole page re-lays itself out around the missing column, so
# stepping through a module makes the text jump about. The picture is what
# holds the layout still.
#
# The art is drawn by scripts/generate-photos.mjs and keyed by slug in
# lib/lessonArt.ts. A lesson's own "media" overrides it.
with open("lib/lessonArt.ts") as fh:
    art_slugs = set(re.findall(r'^\s*"([^"]+)":\s*\{\s*src:', fh.read(), re.M))
for les in lessons:
    if les["playgroundTask"]["type"] not in ("none", "placeholder"):
        continue
    if les.get("media") or les["slug"] in art_slugs:
        continue
    errors.append(
        f"NO PICTURE: {les['slug']} has no activity and no image — add one to "
        f"LESSON_MANIFEST in scripts/generate-photos.mjs and re-run it, or give "
        f"the lesson its own \"media\". Without it the lesson page changes shape."
    )


# Report
if warnings:
    print(f"{len(warnings)} warning(s):")
    for w in warnings:
        print(f"  ~ {w}")
if errors:
    print(f"\n{len(errors)} ERROR(S) FOUND:\n")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print(f"All {len(lessons)} lessons pass validation.")
    sys.exit(0)
