export default function MusicNoteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 160" className={className} aria-hidden="true">
      <ellipse cx="32" cy="130" rx="28" ry="24" fill="#111" />
      <rect x="50" y="20" width="14" height="112" fill="#111" />
      <path d="M64,20 C78,32 92,44 90,66 C88,84 76,96 66,106 C72,88 76,64 64,50 Z" fill="#111" />
    </svg>
  );
}
