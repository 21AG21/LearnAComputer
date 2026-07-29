"use client";

import { useRef, useState } from "react";
import { checkCopyPasteTask } from "./TaskChecker";

interface CopyPasteTaskProps {
  instructions?: string;
  sourceText: string;
  onResult: (success: boolean) => void;
}

/**
 * Copy the sentence, paste it in the box.
 *
 * The box used to accept **typed** text. The instructions say "press Ctrl+C…
 * press Ctrl+V", the lesson is called Copy, Cut, and Paste — and a learner who
 * carefully retyped the sentence passed it, having practiced typing. The
 * course's own real-world missions already hold the right standard ("a paste
 * event carrying text they did not type"); the simulated lesson that teaches
 * the shortcut did not.
 *
 * Now it wants a real paste. Typing the right words is not failed — it is
 * answered, kindly, with what to do instead, because this audience reads a red
 * box as proof they are no good at this.
 */
export default function CopyPasteTask({ instructions, sourceText, onResult }: CopyPasteTaskProps) {
  const [pasted, setPasted] = useState("");
  const [nudge, setNudge] = useState<string | null>(null);
  /** Whether what is in the box arrived by paste rather than by typing. */
  const arrivedByPaste = useRef(false);

  function handleSubmit() {
    const matches = checkCopyPasteTask("pasted-matches-source", { source: sourceText, pasted });
    if (matches && !arrivedByPaste.current) {
      setNudge(
        "Those are the right words — but they were typed, and this lesson is about copying. " +
          "Select the sentence above, press Ctrl+C (or Command+C), click the box, then press Ctrl+V (or Command+V).",
      );
      return;
    }
    setNudge(null);
    onResult(matches);
  }

  return (
    <div className="space-y-3">
      {instructions && <p className="text-sm text-gray-500">{instructions}</p>}
      <div>
        <p className="text-sm text-gray-500 mb-1">Select and copy this text:</p>
        <p className="border rounded p-2 bg-gray-50 select-all">{sourceText}</p>
      </div>
      <div>
        <label htmlFor="paste-target" className="text-sm text-gray-500 mb-1 block">
          Paste it here:
        </label>
        <textarea
          id="paste-target"
          value={pasted}
          onPaste={() => {
            arrivedByPaste.current = true;
            setNudge(null);
          }}
          onChange={(e) => {
            // Typing after a paste means they are editing it by hand again.
            if (e.target.value.length < pasted.length || !pasted) {
              if (!arrivedByPaste.current) arrivedByPaste.current = false;
            }
            setPasted(e.target.value);
          }}
          className="border rounded p-2 w-full"
          rows={3}
        />
      </div>
      {nudge && (
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 text-sm">{nudge}</p>
      )}
      <button onClick={handleSubmit} className="border rounded px-4 py-2">
        Check my work
      </button>
    </div>
  );
}
