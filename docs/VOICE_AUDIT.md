# Voice audit — removing the machine-written tells

**2026-07-29.** The brief: make the site not read as generated, without
rewriting it into something else.

## What was actually wrong

Scanning all 198 lessons plus every page outside a lesson turned up a clean
split, and it follows the order the course was written in.

The **later work** — the accessibility unit, the `final-*` lessons, every unit
assessment, the real-world missions — reads like a person wrote it. Plain,
specific, no praise adjectives:

> Bigger, heavier, sharper, and a pointer you can find. Four settings, and none
> of them permanent.

The **earlier units** were written to a template, and the template shows:

> You evaluated permissions like a pro! Always ask: does this app actually need
> what it is asking for?

The formula is identifiable: **restate what the learner did, add an
exclamation mark, append a generic benefit, close with an imperative tip.**
Once you have seen it you cannot stop seeing it, and a learner meets it after
*every single activity*.

Counted tells, before and after:

| Tell | Before | After |
|---|---:|---:|
| Exclamation marks in lesson copy | 170 | 37 |
| Em dashes in lesson copy | 448 | 366 |
| Lessons carrying 5+ em dashes | 16 | 8 |
| "like a pro" | 3 | 0 |
| Praise-word openers (Perfect! Wonderful! Outstanding! Excellent! Fantastic!) | 7 | 0 |
| `X = Y` shorthand ("Cloud backup = peace of mind") | 4 | 0 |
| Template closers ("Let's practice:", "Let's explore!") | 25 | 5 |

## What was deliberately *not* changed

**The em dash is not banned.** It is the most-cited tell right now, and the
instinct is to purge it — but the best-written lessons on the site use it
deliberately and read the worse without it. Removing all 448 would have flattened
the prose that was already working, which is the opposite of the brief.

So the rule applied was **density, not count**: no lesson should show five of
them on one screen, all doing the same job (a dramatic pause before a
restatement). Eight lessons were over that line and were thinned. The rest were
left alone.

Same reasoning for the 37 surviving exclamation marks. Almost all of them are
inside text the learner *types* ("Hi Doctor Digital!"), or a genuine warning
("A 'VIRUS DETECTED!' popup is ALWAYS fake"). Those are not enthusiasm, they are
content.

## Two real bugs found by reading the copy

Neither is a voice problem. Both were found only because this pass read every
learner-facing string, which no automated check does.

1. **`StorageNotice` still advertised sign-in.** When a browser cannot save
   progress, the banner ended: *"Signing in saves it for good."* There has been
   no sign-in since accounts were removed on 2026-07-28. This is the fifth
   residue of that removal, and the first one inside the product rather than the
   sales material — `pitch-check` reads the docs, and nothing read the
   components. Now it names the actual causes (a private window, a locked-down
   machine).

2. **British currency in a course sold in the US.** `shopping-spot-fake` priced
   its three shops in pounds: £24.99, £4.99, £6.50. `spelling-check.py` enforces
   American spelling and never looked at currency symbols. Now dollars.

`spelling-check.py` also gained `unauthorised` and six more `-ise` verbs, after
"unauthorised access" was found sitting in the Terms page — a file no earlier
sweep had read closely.

## The thing worth remembering

Prose rots differently from code. A false claim in a component compiles, renders,
passes twelve harnesses, and sits in front of learners for a week — because every
check this repo has asks whether the product *works*, and none of them asks
whether it is *telling the truth*. The only instrument that finds that is reading
it.
