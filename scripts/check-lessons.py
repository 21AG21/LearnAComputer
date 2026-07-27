#!/usr/bin/env python3
"""Validate lesson JSON: orders, capitalization, banned types, ungiven values."""

import json
import glob
import sys
import re
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

# Report
if errors:
    print(f"\n{len(errors)} ERROR(S) FOUND:\n")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print(f"All {len(lessons)} lessons pass validation.")
    sys.exit(0)
