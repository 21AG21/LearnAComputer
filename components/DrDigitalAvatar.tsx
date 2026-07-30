import type { DrDigitalMood } from "@/components/DrDigital";

interface DrDigitalAvatarProps {
  className?: string;
  mood?: DrDigitalMood;
}

/**
 * Dr. Digital himself.
 *
 * Three things about this drawing are load-bearing, and the version before it got
 * all three wrong:
 *
 * 1. **The viewBox is square.** Every caller renders him in a square box
 *    (`w-14 h-14` in the speech bubble, `h-16 w-16` on the error pages). The old
 *    art was 240x420, so `preserveAspectRatio` letterboxed it to 32px wide inside
 *    a 56px box — small enough that the whole character was an unreadable smear of
 *    red, green and blue. Head-and-shoulders at 1:1 fills the box it was given.
 *
 * 2. **The outline is black in both themes, except on the antenna.** The old art
 *    stroked `#111` on a bubble whose dark-mode background is `#111827`, and in
 *    dark mode the outline vanished and the shapes floated apart. That was a
 *    consequence of filling the shapes with saturated red/green/blue: the rim was
 *    the only thing separating them, so losing it lost the drawing.
 *
 *    This shell is filled `#e9eef4`, which changes the problem. A black rim on a
 *    light shell is high contrast from the inside no matter what is behind it, and
 *    the silhouette comes from light-shell-against-dark-bubble rather than from the
 *    rim. So he keeps his black outline in dark mode and looks like the same
 *    character in both themes.
 *
 *    The antenna is the exception, and the reason is worth keeping: its stalk and
 *    bulb rim are the only strokes drawn on the page background instead of on top
 *    of a fill. Black there really would disappear on a dark bubble, leaving a
 *    colored dot floating above the head with no visible stem. Those two use
 *    `currentColor`, which the `<svg>`'s own classes resolve per theme.
 *
 * 3. **He has a face.** The old art's aria-label promised "a friendly striped
 *    robot" and drew three abstract blobs with no eyes. This is a course for people
 *    who are nervous about computers; the mascot doing the reassuring should look
 *    like someone.
 *
 * The red/green/blue base is the one thing kept from the old character — same three
 * hues, moved below the face so it reads as identity instead of covering the eyes.
 *
 * The clip-path id is fixed rather than `useId()`d on purpose: every instance
 * clips the identical shape, so two avatars on one page resolving to the same
 * definition is a no-op, and keeping the hook out lets this stay a server
 * component for `not-found.tsx`.
 */
export default function DrDigitalAvatar({ className, mood = "neutral" }: DrDigitalAvatarProps) {
  const bust = "M20 200 C20 170 55 154 100 154 C145 154 180 170 180 200 Z";

  return (
    <svg
      viewBox="0 0 200 200"
      className={`text-[#12212e] dark:text-slate-100 ${className ?? ""}`}
      role="img"
      aria-label="Dr. Digital, a friendly robot"
    >
      <defs>
        <clipPath id="dd-bust">
          <path d={bust} />
        </clipPath>
      </defs>

      {/* The antenna, stroked in currentColor because it is the only part drawn
          against the page rather than against a fill of its own. The bulb is the
          quietest place to carry mood — it echoes the speech bubble's own border
          color without restyling his face. */}
      <g stroke="currentColor" strokeWidth={8} strokeLinejoin="round">
        <line x1="100" y1="30" x2="100" y2="18" strokeLinecap="round" />
        <circle cx="100" cy="12" r="8" fill={BULB[mood]} />
      </g>

      {/* Shell: one group so the whole robot shares one outline weight. */}
      <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <rect x="16" y="70" width="16" height="34" rx="8" fill="#e9eef4" />
        <rect x="168" y="70" width="16" height="34" rx="8" fill="#e9eef4" />
        <rect x="90" y="134" width="20" height="22" fill="#e9eef4" />
        <rect x="30" y="28" width="140" height="112" rx="30" fill="#e9eef4" />
        <g clipPath="url(#dd-bust)">
          <rect x="20" y="154" width="50" height="46" fill="#e63946" />
          <rect x="70" y="154" width="60" height="46" fill="#2a9d5c" />
          <rect x="130" y="154" width="50" height="46" fill="#3a7bd5" />
        </g>
        <path d={bust} fill="none" />
      </g>

      {/* Face. Dark screen, bright features — the pairing that survives being
          shrunk to 40px, which is where he spends most of his life. */}
      <rect x="44" y="44" width="112" height="80" rx="22" fill="#16273a" />
      <Face mood={mood} />
    </svg>
  );
}

/** The outline. Fixed, not `currentColor` — see note 2 in the header. */
const INK = "#12212e";

const BULB: Record<DrDigitalMood, string> = {
  neutral: "#3a7bd5",
  success: "#2a9d5c",
  hint: "#f0b429",
};

function Face({ mood }: { mood: DrDigitalMood }) {
  if (mood === "success")
    return (
      <>
        <path d="M64 86 Q76 70 88 86" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
        <path d="M112 86 Q124 70 136 86" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
        <path d="M76 101 Q100 123 124 101 Z" fill="#fff" />
      </>
    );

  if (mood === "hint")
    return (
      <>
        <circle cx="76" cy="86" r="11" fill="#fff" />
        <circle cx="124" cy="86" r="11" fill="#fff" />
        {/* One raised brow: the difference between "here is a tip" and a blank stare. */}
        <path d="M114 64 L136 60" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" />
        <path d="M80 109 Q100 115 120 107" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" />
      </>
    );

  return (
    <>
      <circle cx="76" cy="84" r="11" fill="#fff" />
      <circle cx="124" cy="84" r="11" fill="#fff" />
      <path d="M78 105 Q100 119 122 105" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" />
    </>
  );
}
