"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { checkShapeScore } from "./TaskChecker";

interface ShapeClickGameProps {
  instructions: string;
  targetScore: number;
  onResult: (success: boolean) => void;
}

type ShapeKind = "triangle" | "square" | "pentagon" | "hexagon" | "circle";

interface FallingShape {
  id: number;
  kind: ShapeKind;
  left: number;
  top: number;
}

const SHAPE_KINDS: ShapeKind[] = ["triangle", "square", "pentagon", "hexagon", "circle"];
const SHAPE_SRC: Record<ShapeKind, string> = {
  triangle: "/playgrounds/shape-triangle.png",
  square: "/playgrounds/shape-square.png",
  pentagon: "/playgrounds/shape-pentagon.png",
  hexagon: "/playgrounds/shape-hexagon.png",
  circle: "/playgrounds/shape-circle.png",
};
// Medium fall speed: a shape crosses the play area in roughly 12 seconds.
const FALL_PERCENT_PER_TICK = 0.42;
const TICK_MS = 50;
const SPAWN_MS = 1300;

export default function ShapeClickGame({ instructions, targetScore, onResult }: ShapeClickGameProps) {
  const [shapes, setShapes] = useState<FallingShape[]>([]);
  const [score, setScore] = useState(0);
  const nextId = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      setShapes((prev) => [
        ...prev,
        {
          id: nextId.current++,
          kind: SHAPE_KINDS[Math.floor(Math.random() * SHAPE_KINDS.length)],
          left: 4 + Math.random() * 84,
          top: -14,
        },
      ]);
    }, SPAWN_MS);

    const fallInterval = setInterval(() => {
      setShapes((prev) =>
        prev.map((s) => ({ ...s, top: s.top + FALL_PERCENT_PER_TICK })).filter((s) => s.top < 102)
      );
    }, TICK_MS);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(fallInterval);
    };
  }, []);

  useEffect(() => {
    if (!finished.current && checkShapeScore(score, targetScore)) {
      finished.current = true;
      onResult(true);
    }
  }, [score, targetScore, onResult]);

  function handleShapeClick(id: number) {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    setScore((prev) => prev + 1);
  }

  return (
    <div className="h-full flex flex-col items-center px-6 py-6 bg-white" aria-label={instructions}>
      <h2 className="text-4xl font-bold mb-2 text-center">Click on {targetScore} falling shapes to advance!</h2>
      <p className="text-xl font-semibold mb-3" aria-live="polite">
        Score: {score} / {targetScore}
      </p>
      <div className="relative w-full max-w-5xl flex-1 border-4 border-black bg-[#c2e6fb] overflow-hidden">
        {shapes.map((shape) => (
          <button
            key={shape.id}
            onClick={() => handleShapeClick(shape.id)}
            aria-label={`Click the ${shape.kind}`}
            className="absolute w-20 h-20"
            style={{ left: `${shape.left}%`, top: `${shape.top}%` }}
          >
            <Image
              src={SHAPE_SRC[shape.kind]}
              alt={shape.kind}
              fill
              sizes="80px"
              className="object-contain pointer-events-none"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
