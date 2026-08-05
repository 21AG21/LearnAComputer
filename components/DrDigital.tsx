import DrDigitalAvatar from "@/components/DrDigitalAvatar";

export type DrDigitalMood = "neutral" | "hint" | "success";

interface DrDigitalProps {
  message: string;
  mood?: DrDigitalMood;
}

const MOOD_STYLES: Record<DrDigitalMood, string> = {
  neutral: "border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900",
  hint: "border-yellow-400 bg-yellow-100 dark:bg-yellow-950/50",
  success: "border-green-400 bg-green-50 dark:bg-green-950/40",
};

/**
 * Renders a Dr. Digital message. Content is newline-separated: lines that start
 * with "• " (or "- ") become a bulleted list; every other non-empty line is a
 * paragraph. Single-line messages (success/hint) render as one paragraph.
 */
/**
 * Renders **bold** spans. Lesson briefs use it to mark the data a learner is *given*
 * — an album name, a search term, a site — as distinct from the skill being assessed.
 */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function MessageBody({ message }: { message: string }) {
  const lines = message.split("\n").map((l) => l.trim()).filter(Boolean);

  // Group consecutive bullet lines into a single list so the whole block reads
  // as one set of points rather than separate one-item lists.
  const blocks: Array<{ type: "p"; text: string } | { type: "ul"; items: string[] }> = [];
  for (const line of lines) {
    const isBullet = line.startsWith("• ") || line.startsWith("- ");
    if (isBullet) {
      const text = line.replace(/^[•-]\s+/, "");
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") last.items.push(text);
      else blocks.push({ type: "ul", items: [text] });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, i) =>
        block.type === "p" ? (
          <p key={i} className="text-2xl leading-relaxed">
            <Rich text={block.text} />
          </p>
        ) : (
          <ul key={i} className="space-y-2">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2 text-2xl leading-relaxed">
                <span aria-hidden="true" className="text-blue-500 shrink-0">
                  •
                </span>
                <span><Rich text={item} /></span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/**
 * Avatar and name on one short line, message full width underneath.
 *
 * The avatar used to sit *beside* the message in a `flex items-start` row, which
 * left a 56px column of dead space running down the left for the whole height of
 * the text — on a four-bullet lesson that is a quarter of the bubble empty, and
 * the message paid for it twice: once in the wasted area, and again in a reading
 * measure so narrow that "Two skills to practice here" wrapped onto two lines.
 *
 * A header row costs one row of height and gives the text the full width back.
 * The avatar is deliberately smaller here than the 56px it was — it reads fine
 * down to 40px, and a shorter header row is the whole point of the change.
 */
export default function DrDigital({ message, mood = "neutral" }: DrDigitalProps) {
  return (
    <div
      key={mood}
      data-mood={mood}
      // `rounded-xl`, not `rounded`: every other card on the site — the lesson
      // rows, the progress panel, the certificate list, the phone course's
      // teaching card — is 12px, and Dr. Digital's 4px corner was the one box
      // that looked like it came from a different site.
      className={`rounded-xl border-2 p-4 animate-pop-in ${MOOD_STYLES[mood]}`}
    >
      <div className="flex items-center gap-2">
        <DrDigitalAvatar className="w-10 h-10 shrink-0" mood={mood} />
        <p className="text-base font-semibold">Dr. Digital</p>
      </div>
      <div className="mt-2">
        <MessageBody message={message} />
      </div>
    </div>
  );
}
