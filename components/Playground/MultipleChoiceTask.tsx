"use client";

import { useState } from "react";

interface Option {
  text: string;
  correct: boolean;
}

interface MultipleChoiceTaskProps {
  question: string;
  options: Option[];
  onResult: (success: boolean) => void;
}

const OPTION_STYLES = [
  { base: "bg-[#3B82F6] hover:bg-[#2563EB]", letter: "A" },
  { base: "bg-[#EF4444] hover:bg-[#DC2626]", letter: "B" },
  { base: "bg-[#F59E0B] hover:bg-[#D97706]", letter: "C" },
  { base: "bg-[#10B981] hover:bg-[#059669]", letter: "D" },
];

export default function MultipleChoiceTask({ question, options, onResult }: MultipleChoiceTaskProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "wrong" | "correct">("idle");

  function handleChoice(idx: number) {
    if (phase === "correct") return;
    setSelectedIdx(idx);
    if (options[idx].correct) {
      setPhase("correct");
      setTimeout(() => onResult(true), 900);
    } else {
      setPhase("wrong");
      setTimeout(() => {
        setSelectedIdx(null);
        setPhase("idle");
      }, 1000);
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8 bg-white">
      <p className="text-3xl font-bold text-center max-w-2xl leading-snug">{question}</p>
      <div className="grid grid-cols-2 gap-5 w-full max-w-2xl">
        {options.map((opt, i) => {
          const style = OPTION_STYLES[i % OPTION_STYLES.length];
          const isSelected = selectedIdx === i;
          const isCorrect = phase === "correct" && isSelected;
          const isWrong = phase === "wrong" && isSelected;

          return (
            <button
              key={i}
              onClick={() => handleChoice(i)}
              className={`
                relative p-6 rounded-2xl text-white text-left font-bold text-xl
                border-4 border-black transition-all duration-150 select-none
                ${isCorrect ? "bg-green-400 border-green-600 scale-105 shadow-xl" :
                  isWrong ? "bg-red-400 border-red-600 shake" :
                  style.base}
              `}
            >
              <span className="absolute top-3 left-3 text-sm font-black opacity-60 select-none">
                {style.letter}
              </span>
              <span className="block mt-5 leading-tight">{opt.text}</span>
              {isCorrect && (
                <span className="absolute top-3 right-3 text-2xl">✓</span>
              )}
              {isWrong && (
                <span className="absolute top-3 right-3 text-2xl">✗</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
