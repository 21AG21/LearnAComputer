import DrDigitalAvatar from "@/components/DrDigitalAvatar";

export type DrDigitalMood = "neutral" | "hint" | "success";

interface DrDigitalProps {
  message: string;
  mood?: DrDigitalMood;
}

const MOOD_STYLES: Record<DrDigitalMood, string> = {
  neutral: "border-gray-300 bg-white",
  hint: "border-yellow-400 bg-yellow-100",
  success: "border-green-400 bg-green-50",
};

/**
 * Renders a Dr. Digital message. Content is newline-separated: lines that start
 * with "• " (or "- ") become a bulleted list; every other non-empty line is a
 * paragraph. Single-line messages (success/hint) render as one paragraph.
 */
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
            {block.text}
          </p>
        ) : (
          <ul key={i} className="space-y-2">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2 text-2xl leading-relaxed">
                <span aria-hidden="true" className="text-blue-500 shrink-0">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

export default function DrDigital({ message, mood = "neutral" }: DrDigitalProps) {
  return (
    <div
      key={mood}
      data-mood={mood}
      className={`flex gap-3 items-start border-2 rounded p-4 animate-pop-in ${MOOD_STYLES[mood]}`}
    >
      <DrDigitalAvatar className="w-14 h-14 shrink-0" />
      <div>
        <p className="text-base font-semibold">Dr. Digital</p>
        <MessageBody message={message} />
      </div>
    </div>
  );
}
