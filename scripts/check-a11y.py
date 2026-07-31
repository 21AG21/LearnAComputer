#!/usr/bin/env python3
"""Accessibility guard — the machine-checkable half of "images have descriptions."

Every automated a11y harness this repo owns measures *color* (contrast-check,
sim-contrast-check, simdark-check) or *focus* (hostile-check). None of them asks
the one question a blind learner cares about most: does every image carry a text
description a screen reader can read out? This does, statically, so it cannot
regress silently.

It fails the build when:

1. an `<img>` or a Next `<Image>` is missing the `alt` attribute entirely, or
2. a lesson JSON `media` block has an image `src` but no non-empty `alt`.

Note what it deliberately allows: `alt=""`. An empty alt is the correct,
intentional way to mark a *decorative* image so a screen reader skips it (the
homepage hero photo behind the headline, a dock-icon tile whose button already
carries the name). The violation is a *missing* attribute, where the reader is
left to announce a filename. Lesson `media` pictures are always informative, so
those must be non-empty.

Icons are out of scope on purpose: every glyph in `Icons.tsx` is `aria-hidden`
by default (see `base()` there), and icon-only buttons carry their own
`aria-label` — neither is an <img>.

Exit code 1 on any finding, 0 when clean. No dependencies.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIRS = ["app", "components"]
LESSON_DIR = ROOT / "content" / "lessons"

# `<img ` / `<img>` / `<img\n`, and `<Image ...` — but never `<ImageIcon`,
# `<ImageViewer` (the \b after the name refuses a following word character).
TAG_RE = re.compile(r"<(img|Image)\b")


def opening_tag(text: str, start: int) -> str:
    """Return the substring of an element's opening tag, from `<` to its closing
    `>`, honoring JSX braces, strings and template literals so a `>` inside an
    attribute value (`sizes={`${px}px`}`, `alt="a > b"`) doesn't end it early."""
    i = start
    n = len(text)
    depth = 0          # JSX expression-brace depth, counted only outside strings
    quote = ""         # active string delimiter: ' " or `
    while i < n:
        c = text[i]
        if quote:
            if c == quote:
                quote = ""
        elif c in "'\"`":
            quote = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth = max(0, depth - 1)
        elif c == ">" and depth == 0:
            return text[start : i + 1]
        i += 1
    return text[start : start + 4000]  # unterminated: cap the window


def scan_source() -> list[str]:
    problems: list[str] = []
    for d in SRC_DIRS:
        for path in sorted((ROOT / d).rglob("*.tsx")):
            text = path.read_text(encoding="utf-8")
            for m in TAG_RE.finditer(text):
                tag = opening_tag(text, m.start())
                if not re.search(r"\balt\s*=", tag):
                    line = text.count("\n", 0, m.start()) + 1
                    rel = path.relative_to(ROOT)
                    problems.append(f"{rel}:{line}  <{m.group(1)}> has no alt attribute")
    return problems


def scan_lessons() -> list[str]:
    problems: list[str] = []
    for path in sorted(LESSON_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            problems.append(f"{path.name}  invalid JSON: {e}")
            continue
        media = data.get("media")
        if isinstance(media, dict) and media.get("src"):
            if not (media.get("alt") or "").strip():
                problems.append(f"{path.name}  media has a src but empty/missing alt")
    return problems


def main() -> int:
    problems = scan_source() + scan_lessons()
    if problems:
        print("Accessibility check FAILED — images without a text description:\n")
        for p in problems:
            print(f"  {p}")
        print(f"\n{len(problems)} problem(s). Every <img>/<Image> needs an alt "
              "(use alt=\"\" only for purely decorative images); every lesson "
              "media picture needs a real description.")
        return 1
    print("Accessibility check passed — every image carries an alt attribute, "
          "and every lesson media picture has a description.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
