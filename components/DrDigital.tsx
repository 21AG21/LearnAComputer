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

export default function DrDigital({ message, mood = "neutral" }: DrDigitalProps) {
  return (
    <div data-mood={mood} className={`flex gap-3 items-start border-2 rounded p-4 ${MOOD_STYLES[mood]}`}>
      <DrDigitalAvatar className="w-14 h-14 shrink-0" />
      <div>
        <p className="text-base font-semibold">Dr. Digital</p>
        <p className="text-xl leading-snug">{message}</p>
      </div>
    </div>
  );
}
