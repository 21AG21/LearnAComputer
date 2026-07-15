import DrDigitalAvatar from "@/components/DrDigitalAvatar";

export type DrDigitalMood = "neutral" | "hint" | "success";

interface DrDigitalProps {
  message: string;
  mood?: DrDigitalMood;
}

export default function DrDigital({ message, mood = "neutral" }: DrDigitalProps) {
  return (
    <div data-mood={mood} className="flex gap-3 items-start border rounded p-4">
      <DrDigitalAvatar className="w-12 h-12 shrink-0" />
      <div>
        <p className="text-sm font-semibold">Dr. Digital</p>
        <p>{message}</p>
      </div>
    </div>
  );
}
