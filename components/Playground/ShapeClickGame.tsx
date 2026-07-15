"use client";

import { useEffect, useRef, useState } from "react";
import { checkShapeScore } from "./TaskChecker";

interface ShapeClickGameProps {
  instructions: string;
  targetScore: number;
  onResult: (success: boolean) => void;
}

interface FallingShape {
  id: number;
  sides: number;
  left: number;
  top: number;
}

const SHAPE_SIDE_OPTIONS = [3, 4, 5, 6];
const FALL_PERCENT_PER_TICK = 0.15;
const TICK_MS = 50;
const SPAWN_MS = 1400;

function polygonClipPath(sides: number): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = 50 + 50 * Math.cos(angle);
    const y = 50 + 50 * Math.sin(angle);
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${points.join(", ")})`;
}

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
          sides: SHAPE_SIDE_OPTIONS[Math.floor(Math.random() * SHAPE_SIDE_OPTIONS.length)],
          left: 10 + Math.random() * 70,
          top: -10,
        },
      ]);
    }, SPAWN_MS);

    const fallInterval = setInterval(() => {
      setShapes((prev) => prev.map((s) => ({ ...s, top: s.top + FALL_PERCENT_PER_TICK })).filter((s) => s.top < 100));
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
    <div className="space-y-2">
      <p className="text-sm text-gray-500">{instructions}</p>
      <p className="text-sm font-semibold">
        Score: {score} / {targetScore}
      </p>
      <div className="relative border rounded h-96 overflow-hidden bg-sky-50">
        {shapes.map((shape) => (
          <button
            key={shape.id}
            onClick={() => handleShapeClick(shape.id)}
            aria-label={`Click the ${shape.sides}-sided shape`}
            className="absolute w-12 h-12 bg-indigo-500 text-white flex items-center justify-center font-bold"
            style={{
              left: `${shape.left}%`,
              top: `${shape.top}%`,
              clipPath: polygonClipPath(shape.sides),
            }}
          >
            {shape.sides}
          </button>
        ))}
      </div>
    </div>
  );
}
