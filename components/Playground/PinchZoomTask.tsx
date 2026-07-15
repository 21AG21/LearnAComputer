"use client";

import { ComponentType, useEffect, useRef, useState } from "react";
import BrowserSimulator from "./BrowserSimulator";
import { checkZoomCode } from "./TaskChecker";
import { DogIllustration, SnakeIllustration, BirdIllustration, CowIllustration } from "./AnimalIllustrations";

interface PinchZoomTaskProps {
  instructions: string;
  onResult: (success: boolean) => void;
  onExit: () => void;
}

const ANIMALS = [
  { id: "dog", Illustration: DogIllustration },
  { id: "snake", Illustration: SnakeIllustration },
  { id: "bird", Illustration: BirdIllustration },
  { id: "cow", Illustration: CowIllustration },
] as const;

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_SENSITIVITY = 0.02;

function ZoomableAnimal({
  digit,
  Illustration,
  label,
}: {
  digit: number;
  Illustration: ComponentType<{ className?: string }>;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MIN_SCALE);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev - e.deltaY * ZOOM_SENSITIVITY)));
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-32 h-32 sm:w-40 sm:h-40 overflow-hidden border rounded bg-white touch-none"
      aria-label={`${label}, pinch or ctrl+scroll to zoom`}
    >
      <div
        className="w-full h-full flex items-center justify-center origin-center"
        style={{ transform: `scale(${scale})` }}
      >
        <Illustration className="w-full h-full" />
        <span
          aria-hidden="true"
          className="absolute text-black select-none font-mono"
          style={{ fontSize: "5px", top: "48%", left: "48%" }}
        >
          {digit}
        </span>
      </div>
    </div>
  );
}

export function PinchZoomTask({ instructions, onResult, onExit }: PinchZoomTaskProps) {
  const [answerDigits] = useState<number[]>(() => ANIMALS.map(() => Math.floor(Math.random() * 10)));
  const [typedDigits, setTypedDigits] = useState<string[]>(["", "", "", ""]);

  function handleDigitChange(index: number, value: string) {
    if (!/^[0-9]?$/.test(value)) return;
    setTypedDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit() {
    onResult(checkZoomCode(typedDigits, answerDigits));
  }

  return (
    <BrowserSimulator tabTitle="My Animals" url="exampleanimalpage.com" onExit={onExit}>
      <div aria-label={instructions} className="h-full flex flex-col items-center justify-center gap-8 px-6 py-6 overflow-auto">
        <div className="flex gap-4 flex-wrap justify-center">
          {ANIMALS.map((animal, i) => (
            <ZoomableAnimal key={animal.id} digit={answerDigits[i]} Illustration={animal.Illustration} label={animal.id} />
          ))}
        </div>

        <p className="text-2xl font-bold text-center max-w-2xl">
          Zoom in to each animal and type the code that you see here:
        </p>

        <div className="flex border-4 border-black">
          {Array.from({ length: 9 }).map((_, i) => {
            if (i % 2 === 1) {
              const inputIndex = (i - 1) / 2;
              return (
                <input
                  key={i}
                  value={typedDigits[inputIndex]}
                  onChange={(e) => handleDigitChange(inputIndex, e.target.value)}
                  maxLength={1}
                  inputMode="numeric"
                  aria-label={`Digit ${inputIndex + 1}`}
                  className="w-14 h-14 text-center text-2xl border-x-4 border-black outline-none"
                />
              );
            }
            return <div key={i} aria-hidden="true" className="w-8 h-14 bg-sky-200 border-x-4 border-black" />;
          })}
        </div>

        <button onClick={handleSubmit} className="border rounded px-4 py-2">
          Check my work
        </button>
      </div>
    </BrowserSimulator>
  );
}
