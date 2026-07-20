#!/usr/bin/env python3
"""Validate lesson JSON files: unique orders, capitalization, no banned types."""

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

# Report
if errors:
    print(f"\n{len(errors)} ERROR(S) FOUND:\n")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print(f"All {len(lessons)} lessons pass validation.")
    sys.exit(0)
