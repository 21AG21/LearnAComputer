# Solver-masked bug audit

Two bugs shipped that **solve-check was green through** and a real learner was
stuck on:

- **Ctrl+Shift+Z redo** (Unit 2 notes) — the checker compared `e.key === "z"`,
  but a browser reports the Shift-modified character `"Z"`. The solver dispatched
  a literal lowercase `"z"`, so it matched the (also-wrong) checker; every human
  sent `"Z"` and could not finish the lesson's last step.
- **File arrow-key navigation** (Unit 2, `kb-arrow-keys`) — the grid had a
  keydown handler but nothing focused the grid, and clicks are blocked in that
  mode, so a learner's arrow keys fell to `<body>`. The solver called `.focus()`
  itself, so it never felt the gap.

Both share one shape: **the solver reaches a handler through a channel a human
does not have, so the harness passes while the learner is stranded.** This audit
walks the whole interaction surface for more of the same.

## The masked-bug taxonomy

A bug is masked (solver green, human stuck) only when one of these holds. Each
was checked across every lesson.

| Divergence | Where the solver cheats | Result |
|---|---|---|
| **Key casing** | `checkNotesShortcut` lowercases the key; the solver now sends the real Shift-uppercased key (`gestures.key` / `solver` SHORTCUT_KEYS) | **clean** — the only case-sensitive check is redo/undo, fixed |
| **Focus assumption** | `typeInto`, `arrow-select`, `shortcut`, keyboard-`open` all `.focus()` first | **clean** — every such handler now has a component-side auto-focus (Notes editor on step change, FileManager grid on mount, KeyboardNav container on active) |
| **Modifier requirement** | solver sends **both** `ctrlKey` and `metaKey` on shortcuts | **clean** — `checkNotesShortcut` and `KeysCheck` both accept `ctrl OR meta`; no check requires both |
| **Typing `say` vs `value`** | solver types `value`, never reads `say` | **clean** — scanned every guided step; a learner who types what the instruction quotes always hits the checked value |
| **Synthetic-only field (`keyCode`, digit `code`)** | solver omits `keyCode`; `code` is wrong for digits/space | not masking — a check reading these would make the **solver** fail (caught), not a human |
| **One-shot value vs per-keystroke** | `setNativeValue` sets the whole value + one `input` event | not masking — per-keystroke logic makes the **solver** fail (caught); the reverse doesn't occur here |
| **Occlusion / z-order** | `dispatchEvent` clicks ignore what is painted on top | **no evidence**; ring-check covers scroll/overflow clipping but not paint-over. A reliable sweep needs a headless viewport (the embedded pane collapses to 0×0 and invalidates every geometry read — the same artifact that once produced a false "arrow keys work" pass). Left as a known-uncovered class. |

## The finding: an EXEMPT lesson no harness plays

solve-check exempts six activity families it cannot script. Five are covered
elsewhere (real-world → mission-check) or verified by hand here (shape-click has
no fail state; match-parts is click-to-select, not drag; pinch-zoom has +/−
button fallbacks; browser-scroll-code reveals the code after an 80px scroll).
The sixth — **`keyboard-nav-game`** — is played by *nothing*: it is absent from
both `solve-check`'s EXEMPT-and-stepless coverage and `stray-check`'s
`__strayList` (124 slugs, no `kb-tab`). That is exactly where a bug survives.

**`KeyboardNavTask` step 3** read *"Press Tab twice to jump to the Submit
button,"* but its `expectedFocus` was `"age"` — so the pulsing yellow highlight
sat on the **Age** field while the text named **Submit**, and the instruction
was factually wrong (one Tab from Email reaches Age, not Submit). The lesson
still completed by luck of a redundant count, but a beginner reading the words
and looking at the glow gets three contradictory signals. Both lessons that use
this component (`kb-tab`, `keyboard-navigation`) shared it.

Fixed so instruction, target, and highlight agree:

> Step 3: "Press Tab to move forward to the Age field." (→ Age)
> Step 4: "Press Tab once more to land on the Submit button." (→ Submit)

Verified as a human in the browser at desktop width: real Tab/Tab/Shift+Tab
keypresses land on step 4 with the Age field highlighted and the matching text,
and Tab/Tab/Enter drives the frame to `data-sim-done="1"`.

## The lesson

The masked-bug classes that produce *hard blocks* were all eradicable by static
reasoning, because a hard block in a **solver-played** lesson turns solve-check
red — so anything that slips through lives either (a) in the handful of
solver-shortcut divergences, all now closed, or (b) in a lesson the solver never
plays. Check both lists and the space is small. The one real finding sat in (b),
the predicted place.
