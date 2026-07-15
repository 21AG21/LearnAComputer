"use client";

import { useEffect, useRef, useState } from "react";
import MockupPlayground, { Hotspot } from "./MockupPlayground";
import { checkShapeScore } from "./TaskChecker";

interface ShapeClickGameProps {
  instructions: string;
  targetScore: number;
  onResult: (success: boolean) => void;
}

// Invisible click targets over the five shapes drawn in the mockup (% of the 1280x800 image).
const SHAPE_HOTSPOTS = [
  { id: "triangle", left: 8.5, top: 30, width: 19, height: 27.5 },
  { id: "square", left: 36.3, top: 30.5, width: 16.5, height: 26 },
  { id: "pentagon", left: 58, top: 27.5, width: 19, height: 30 },
  { id: "hexagon", left: 7.4, top: 60.5, width: 21, height: 30 },
  { id: "circle", left: 37.4, top: 61, width: 18.5, height: 30 },
];

export default function ShapeClickGame({ instructions, targetScore, onResult }: ShapeClickGameProps) {
  const [score, setScore] = useState(0);
  const finished = useRef(false);

  useEffect(() => {
    if (!finished.current && checkShapeScore(score, targetScore)) {
      finished.current = true;
      onResult(true);
    }
  }, [score, targetScore, onResult]);

  return (
    <MockupPlayground imageSrc="/playgrounds/single-click.png" imageAlt={instructions}>
      {SHAPE_HOTSPOTS.map((shape) => (
        <Hotspot
          key={shape.id}
          left={shape.left}
          top={shape.top}
          width={shape.width}
          height={shape.height}
          label={`Click the ${shape.id}`}
          onClick={() => setScore((prev) => prev + 1)}
        />
      ))}
      <p className="absolute top-[1%] right-[2%] text-lg font-bold" aria-live="polite">
        Score: {score} / {targetScore}
      </p>
    </MockupPlayground>
  );
}
