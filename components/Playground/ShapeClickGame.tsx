"use client";

import { useEffect, useRef, useState } from "react";
import { checkShapeScore } from "./TaskChecker";
import { ShapeTriangle, ShapeSquare, ShapePentagon, ShapeHexagon, ShapeCircle } from "./Icons";

interface ShapeClickGameProps {
  instructions?: string;
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
const SHAPE_COLORS: Record<ShapeKind, string> = {
  triangle: "text-red-500",
  square: "text-blue-500",
  pentagon: "text-green-600",
  hexagon: "text-purple-500",
  circle: "text-orange-500",
};
const SHAPE_COMPONENTS: Record<ShapeKind, React.FC<{ size?: number; className?: string }>> = {
  triangle: ShapeTriangle,
  square: ShapeSquare,
  pentagon: ShapePentagon,
  hexagon: ShapeHexagon,
  circle: ShapeCircle,
};
// Brisk but beginner-friendly: shapes fall a bit faster and spawn about twice as
// often as before, so the play area stays lively instead of feeling empty.
const FALL_PERCENT_PER_TICK = 0.62;
const TICK_MS = 50;
const SPAWN_MS = 700;

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
    <div className="h-full flex flex-col items-center px-6 py-6 bg-white" aria-label={instructions ?? `Click on ${targetScore} falling shapes`}>
      {instructions && <h2 className="text-4xl font-bold mb-2 text-center">{instructions}</h2>}
      <p className="text-xl font-semibold mb-3" aria-live="polite">
        Score: {score} / {targetScore}
      </p>
      <div className="relative w-full max-w-5xl flex-1 border-2 border-gray-300 rounded-lg bg-sky-50 overflow-hidden">
        {shapes.map((shape) => (
          <button
            key={shape.id}
            onClick={() => handleShapeClick(shape.id)}
            aria-label={`Click the ${shape.kind}`}
            className={`absolute w-20 h-20 flex items-center justify-center ${SHAPE_COLORS[shape.kind]}`}
            style={{ left: `${shape.left}%`, top: `${shape.top}%` }}
          >
            {(() => { const Comp = SHAPE_COMPONENTS[shape.kind]; return <Comp size={72} />; })()}
          </button>
        ))}
      </div>
    </div>
  );
}
