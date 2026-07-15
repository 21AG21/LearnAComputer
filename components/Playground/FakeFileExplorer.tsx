"use client";

import { useEffect, useRef, useState } from "react";
import MockupPlayground, { Hotspot } from "./MockupPlayground";
import { checkFilesOpened } from "./TaskChecker";

interface FakeFileExplorerTaskProps {
  instructions: string;
  filesToOpen: string[];
  onResult: (success: boolean) => void;
}

// Invisible double-click targets over the file rows drawn in the mockup (% of the 1280x800 image).
const FILE_HOTSPOTS = [
  { name: "VacationPhoto.png", top: 32, contents: "🏖️ A sunny photo from the beach!" },
  { name: "GroceryList.txt", top: 43.2, contents: "Milk\nEggs\nBread\nApples" },
  { name: "Budget.xlsx", top: 54.4, contents: "Rent: $1200\nGroceries: $300\nSavings: $200" },
  { name: "SecretRecipie.docx", top: 65.6, contents: "Grandma's secret cookies:\nbutter, sugar, flour, love." },
  { name: "FavoriteSong.mp3", top: 76.8, contents: "🎵 Now playing your favorite song!" },
];
const ROW_LEFT = 1.7;
const ROW_WIDTH = 53;
const ROW_HEIGHT = 11.2;

export default function FakeFileExplorerTask({ instructions, filesToOpen, onResult }: FakeFileExplorerTaskProps) {
  const [opened, setOpened] = useState<string[]>([]);
  const [selected, setSelected] = useState<(typeof FILE_HOTSPOTS)[number] | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!finished.current && checkFilesOpened(opened, filesToOpen)) {
      finished.current = true;
      onResult(true);
    }
  }, [opened, filesToOpen, onResult]);

  function handleDoubleClick(file: (typeof FILE_HOTSPOTS)[number]) {
    setSelected(file);
    setOpened((prev) => (prev.includes(file.name) ? prev : [...prev, file.name]));
  }

  return (
    <MockupPlayground imageSrc="/playgrounds/double-click.png" imageAlt={instructions}>
      {FILE_HOTSPOTS.map((file) => (
        <Hotspot
          key={file.name}
          left={ROW_LEFT}
          top={file.top}
          width={ROW_WIDTH}
          height={ROW_HEIGHT}
          label={`Open ${file.name}`}
          onDoubleClick={() => handleDoubleClick(file)}
        />
      ))}
      {selected && (
        <div
          className="absolute whitespace-pre-wrap text-xl font-semibold text-white p-4 pointer-events-none"
          style={{ left: "57%", top: "19%", width: "40%", height: "73%" }}
        >
          {selected.contents}
        </div>
      )}
    </MockupPlayground>
  );
}
