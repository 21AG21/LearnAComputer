interface CatIllustrationProps {
  className?: string;
}

export default function CatIllustration({ className }: CatIllustrationProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Illustration of a cat named DJ">
      <polygon points="60,50 75,10 90,55" fill="#f4a261" />
      <polygon points="140,50 125,10 110,55" fill="#f4a261" />
      <polygon points="65,45 75,22 84,50" fill="#f7c59f" />
      <polygon points="135,45 125,22 116,50" fill="#f7c59f" />
      <ellipse cx="100" cy="150" rx="62" ry="45" fill="#f4a261" />
      <circle cx="100" cy="82" r="52" fill="#f4a261" />
      <circle cx="80" cy="88" r="7" fill="#111" />
      <circle cx="120" cy="88" r="7" fill="#111" />
      <path d="M92 108 Q100 118 108 108" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
      <line x1="35" y1="98" x2="72" y2="93" stroke="#111" strokeWidth="2" />
      <line x1="35" y1="110" x2="72" y2="108" stroke="#111" strokeWidth="2" />
      <line x1="128" y1="93" x2="165" y2="98" stroke="#111" strokeWidth="2" />
      <line x1="128" y1="108" x2="165" y2="110" stroke="#111" strokeWidth="2" />
    </svg>
  );
}
