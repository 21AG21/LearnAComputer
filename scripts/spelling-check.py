#!/usr/bin/env python3
"""Keeps the course in one dialect: American English.

    python3 scripts/spelling-check.py

The course had drifted into a mix — the homepage said "Practise first" while
the settings app said "Color", and lesson prose said "grey" next to Tailwind's
"gray". A learner will not file a bug about it, but a buyer reads the homepage
before they read anything else, and inconsistent spelling reads as unfinished.

Scans learner-facing copy and source for en-GB spellings and a short list of
genuine typos. Exits non-zero on any hit.
"""
import json
import glob
import os
import re
import sys

# en-GB -> en-US. Longest first so "colours" is caught before "colour".
BRITISH = [
    ("colourful", "colorful"), ("colours", "colors"), ("coloured", "colored"), ("colour", "color"),
    ("behaviours", "behaviors"), ("behaviour", "behavior"),
    ("recognising", "recognizing"), ("recognised", "recognized"), ("recognisable", "recognizable"),
    ("recognises", "recognizes"), ("recognise", "recognize"),
    ("organising", "organizing"), ("organised", "organized"), ("organise", "organize"),
    ("customise", "customize"), ("personalisation", "personalization"), ("personalise", "personalize"),
    ("apologise", "apologize"), ("realise", "realize"), ("analyse", "analyze"),
    ("favourites", "favorites"), ("favourite", "favorite"),
    ("neighbours", "neighbors"), ("neighbour", "neighbor"),
    ("honours", "honors"), ("honour", "honor"),
    ("defences", "defenses"), ("defence", "defense"),
    ("licence", "license"), ("centre", "center"), ("theatre", "theater"),
    ("metres", "meters"), ("metre", "meter"),
    ("practising", "practicing"), ("practised", "practiced"),
    ("practises", "practices"), ("practise", "practice"),
    ("greyscale", "grayscale"), ("grey", "gray"),
    ("travelling", "traveling"), ("cancelling", "canceling"),
    # Found in the Terms page, which no earlier sweep had read closely.
    ("unauthorised", "unauthorized"), ("authorised", "authorized"),
    ("prioritise", "prioritize"), ("minimise", "minimize"), ("maximise", "maximize"),
    ("summarise", "summarize"), ("emphasise", "emphasize"), ("apologised", "apologized"),
    # US market and de-branding: "program" (adult day program), "labeled" controls.
    ("programmes", "programs"), ("programme", "program"),
    ("labelling", "labeling"), ("labelled", "labeled"),
]

# Real misspellings worth a permanent guard.
TYPOS = [
    ("recieve", "receive"), ("seperate", "separate"), ("occured", "occurred"),
    ("teh", "the"), ("adress", "address"), ("accomodate", "accommodate"),
    ("existance", "existence"), ("neccessary", "necessary"), ("occassion", "occasion"),
    ("priviledge", "privilege"), ("publically", "publicly"), ("recomend", "recommend"),
    ("succesful", "successful"), ("untill", "until"), ("wierd", "weird"),
    ("definately", "definitely"), ("enviroment", "environment"), ("mispell", "misspell"),
]

# Deliberate exceptions, each with the reason it is allowed to stay wrong.
ALLOW = {
    # Progress is stored by slug in localStorage. Renaming this slug would make
    # every learner who finished the lesson appear not to have. It stays en-GB
    # forever; only its visible text is American. See CLAUDE.md.
    ("content/lessons/a11y-colour-filters.json", "colour"),
}

# kb-delete.json teaches the learner to fix typos, so its typos are the lesson.
TYPO_LESSON_FILES = {"content/lessons/kb-delete.json", "content/lessons/invitation-exercise.json"}

TEXT_KEYS = {
    "drDigitalIntro", "drDigitalSuccess", "drDigitalHint", "title", "warning",
    "say", "instructions", "goal", "hint", "detail", "note", "label",
}

problems = []


def scan(text, path, why):
    for wrong, right in why:
        for m in re.finditer(rf"\b{wrong}\b", text, flags=re.I):
            if (path, m.group(0).lower()) in ALLOW:
                continue
            line = text.count("\n", 0, m.start()) + 1
            problems.append((path, line, m.group(0), right))


def strings(obj, key=None):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from strings(v, k)
    elif isinstance(obj, list):
        for v in obj:
            yield from strings(v, key)
    elif isinstance(obj, str) and key in TEXT_KEYS:
        yield obj


for path in sorted(glob.glob("content/lessons/*.json")):
    raw = open(path).read()
    scan(raw, path, BRITISH)
    if path not in TYPO_LESSON_FILES:
        # Typos only in learner-facing values, not in filenames or ids.
        for s in strings(json.loads(raw)):
            scan(s, path, TYPOS)

sources = (
    glob.glob("components/**/*.tsx", recursive=True)
    + glob.glob("components/**/*.ts", recursive=True)
    + glob.glob("app/**/*.tsx", recursive=True)
    + glob.glob("lib/**/*.ts", recursive=True)
)
for path in sorted(sources):
    body = open(path).read()
    scan(body, path, BRITISH)
    scan(body, path, TYPOS)
    # camelCase hides from \b: colourFilter, ColourFilter.
    for m in re.finditer(r"\b\w*(?:[Cc]olour|[Gg]rey|[Bb]ehaviour|[Ff]avourite)\w*\b", body):
        if m.group(0).lower() in {w for w, _ in BRITISH}:
            continue  # already reported above
        line = body.count("\n", 0, m.start()) + 1
        problems.append((path, line, m.group(0), "use the American spelling"))

if problems:
    print(f"{len(problems)} spelling problem(s):\n")
    for path, line, found, want in problems:
        print(f"  {path}:{line}  {found!r} -> {want!r}")
    print("\nThe course is written in American English. If a hit is deliberate,")
    print("add it to ALLOW in this script with the reason.")
    sys.exit(1)

print("Spelling is consistent: American English throughout.")
