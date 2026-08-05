"use client";

import { useMemo } from "react";

/**
 * The keyboard that slides up out of nowhere — the single biggest difference
 * between typing on a laptop and typing on a phone, and the thing Unit 3 exists
 * to teach.
 *
 * Three decisions worth keeping:
 *
 * **The keys are real buttons, not a picture of a keyboard.** They have to be:
 * the lesson asks the learner to find Shift and the 123 key, and a learner who
 * finds them has to be able to press them. They are also the reason this course
 * can be script-checked at all.
 *
 * **Shift is one-shot, like a real phone.** Tap it, type one letter, and it
 * releases itself. The alternative — a Shift that stays down — is what a laptop
 * does with Caps Lock, and teaching it here would teach the wrong habit.
 *
 * **Emoji are the exception to the project's no-emoji rule, on purpose.** The
 * rule exists so UI glyphs are drawn icons rather than font characters that
 * render differently everywhere. Here the emoji *are the subject of the lesson*,
 * the same carve-out the messaging app's reaction picker already has.
 */

interface PhoneKeyboardProps {
  layout: "letters" | "numbers" | "emoji";
  shift: boolean;
  /** The word being typed, for the suggestion row. */
  draft: string;
  onKey: (char: string) => void;
  onBackspace: () => void;
  onShift: () => void;
  onLayout: (l: "letters" | "numbers" | "emoji") => void;
  onSuggestion: (word: string) => void;
  onEmoji: (name: string, char: string) => void;
  /** Which control the current lesson step is asking for, so it can pulse. */
  highlight?: "shift" | "numbers" | "backspace" | "emoji" | "suggestion" | null;
  /** When the step names a word, only that suggestion pulses — ringing all three
   *  says "one of these", which is not what the step asked for. */
  highlightWord?: string;
}

const ROWS_LETTERS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const ROWS_NUMBERS = ["1234567890", "-/:;()$&@\"", ".,?!'"];

/**
 * The suggestion dictionary. Small and hand-written rather than clever: the
 * lesson needs "birth" to offer "birthday", and a beginner needs the three words
 * on offer to be words they would plausibly have been typing.
 */
const WORDS = [
  "birthday", "birthdays", "birth", "morning", "monday", "money", "mother",
  "thanks", "thank", "there", "these", "hello", "help", "here", "home",
  "running", "runner", "photo", "photos", "phone", "please", "picture",
  "tomorrow", "today", "together", "walking", "waiting", "weekend",
];

/** Emoji the picker offers. Named, so a lesson step can ask for one by name. */
const EMOJI: Array<{ name: string; char: string; label: string }> = [
  { name: "smile", char: "🙂", label: "Smiling face" },
  { name: "grin", char: "😀", label: "Grinning face" },
  { name: "laugh", char: "😂", label: "Laughing face" },
  { name: "wink", char: "😉", label: "Winking face" },
  { name: "heart", char: "❤️", label: "Red heart" },
  { name: "thumbs-up", char: "👍", label: "Thumbs up" },
  { name: "clap", char: "👏", label: "Clapping hands" },
  { name: "wave", char: "👋", label: "Waving hand" },
  { name: "flower", char: "🌷", label: "Tulip" },
  { name: "sun", char: "☀️", label: "Sun" },
  { name: "cake", char: "🎂", label: "Birthday cake" },
  { name: "coffee", char: "☕", label: "Cup of coffee" },
  { name: "dog", char: "🐕", label: "Dog" },
  { name: "cat", char: "🐈", label: "Cat" },
  { name: "car", char: "🚗", label: "Car" },
  { name: "house", char: "🏠", label: "House" },
];

/** The pulsing "act here" ring, same cue the laptop course uses. */
const RING = "animate-ring-pulse rounded-lg";

export default function PhoneKeyboard({
  layout,
  shift,
  draft,
  onKey,
  onBackspace,
  onShift,
  onLayout,
  onSuggestion,
  onEmoji,
  highlight = null,
  highlightWord,
}: PhoneKeyboardProps) {
  // The word in progress is whatever follows the last space — that is what the
  // phone is guessing at, not the whole note.
  const partial = useMemo(() => draft.split(/\s+/).pop()?.toLowerCase() ?? "", [draft]);
  const suggestions = useMemo(() => {
    if (partial.length < 2) return [];
    return WORDS.filter((w) => w.startsWith(partial) && w !== partial).slice(0, 3);
  }, [partial]);

  if (layout === "emoji") {
    return (
      <div className="select-none border-t border-gray-400 bg-gray-200 pb-2 pt-2">
        <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto px-2">
          {EMOJI.map((e) => (
            <button
              key={e.name}
              type="button"
              data-phone-emoji={e.name}
              aria-label={e.label}
              onClick={() => onEmoji(e.name, e.char)}
              className="rounded-lg py-2 text-2xl active:bg-white/70"
            >
              {e.char}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between px-2">
          <Key label="ABC" wide onPress={() => onLayout("letters")} testId="kb-abc" />
          <Key label="Rub out" icon="⌫" onPress={onBackspace} testId="kb-backspace" ring={highlight === "backspace"} />
        </div>
      </div>
    );
  }

  const rows = layout === "letters" ? ROWS_LETTERS : ROWS_NUMBERS;

  return (
    <div className="select-none border-t border-gray-400 bg-gray-200 pb-2">
      {/* Suggestion strip. Always present, even when empty, so the keyboard does
          not jump up and down by a row while somebody is typing on it. */}
      <div className="flex h-9 items-stretch divide-x divide-gray-400 border-b border-gray-300">
        {suggestions.length === 0 ? (
          <span className="flex-1 self-center text-center text-xs text-gray-700">
            Suggested words appear here as you type
          </span>
        ) : (
          suggestions.map((w) => (
            <button
              key={w}
              type="button"
              data-phone-suggestion={w}
              onClick={() => onSuggestion(w)}
              className={`flex-1 text-sm font-medium text-gray-900 active:bg-white ${
                highlight === "suggestion" && (!highlightWord || highlightWord === w) ? RING : ""
              }`}
            >
              {w}
            </button>
          ))
        )}
      </div>

      <div className="space-y-1.5 px-1 pt-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {/* Shift and Rub out flank the last letter row, where a phone puts them. */}
            {layout === "letters" && i === 2 && (
              <Key
                label={shift ? "Shift on" : "Shift"}
                icon="⇧"
                onPress={onShift}
                testId="kb-shift"
                flex
                active={shift}
                ring={highlight === "shift"}
              />
            )}
            {row.split("").map((c) => (
              <button
                key={c}
                type="button"
                data-phone-key={c}
                onClick={() => onKey(shift ? c.toUpperCase() : c)}
                className="min-w-0 flex-1 rounded-lg bg-white py-3 text-center text-lg font-medium text-gray-900 shadow-sm active:bg-gray-300"
              >
                {shift ? c.toUpperCase() : c}
              </button>
            ))}
            {layout === "letters" && i === 2 && (
              <Key label="Rub out" icon="⌫" onPress={onBackspace} testId="kb-backspace" flex ring={highlight === "backspace"} />
            )}
            {layout === "numbers" && i === 2 && (
              <Key label="Rub out" icon="⌫" onPress={onBackspace} testId="kb-backspace" flex ring={highlight === "backspace"} />
            )}
          </div>
        ))}

        <div className="flex gap-1">
          <Key
            label={layout === "letters" ? "123" : "ABC"}
            onPress={() => onLayout(layout === "letters" ? "numbers" : "letters")}
            testId="kb-layout"
            ring={highlight === "numbers"}
          />
          <Key label="Emoji" icon="☺" onPress={() => onLayout("emoji")} testId="kb-emoji" ring={highlight === "emoji"} />
          <button
            type="button"
            data-phone-key=" "
            onClick={() => onKey(" ")}
            className="flex-1 rounded-lg bg-white py-3 text-sm text-gray-600 shadow-sm active:bg-gray-300"
          >
            space
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A control key. The visible glyph and the accessible name are separate on
 * purpose: "⇧" is not a word, and a screen reader announcing "up arrow black"
 * tells a learner nothing about what the key does.
 */
function Key({
  label,
  icon,
  onPress,
  testId,
  wide,
  flex,
  active,
  ring,
}: {
  label: string;
  icon?: string;
  onPress: () => void;
  testId: string;
  wide?: boolean;
  flex?: boolean;
  active?: boolean;
  ring?: boolean;
}) {
  return (
    <button
      type="button"
      data-phone-control={testId}
      aria-label={label}
      onClick={onPress}
      className={`rounded-lg px-3 py-3 text-center text-sm font-semibold shadow-sm ${
        flex ? "flex-[1.4]" : wide ? "px-6" : ""
      } ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-400 text-gray-900 active:bg-gray-500"
      } ${ring ? RING : ""}`}
    >
      {icon ?? label}
    </button>
  );
}

export { EMOJI as PHONE_EMOJI };
