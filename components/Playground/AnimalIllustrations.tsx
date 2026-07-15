interface AnimalProps {
  className?: string;
}

export function DogIllustration({ className }: AnimalProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Illustration of a dog">
      <ellipse cx="70" cy="90" rx="18" ry="30" fill="#8a5a35" transform="rotate(-20 70 90)" />
      <ellipse cx="130" cy="90" rx="18" ry="30" fill="#8a5a35" transform="rotate(20 130 90)" />
      <ellipse cx="100" cy="150" rx="55" ry="42" fill="#c07f45" />
      <circle cx="100" cy="95" r="50" fill="#c07f45" />
      <ellipse cx="100" cy="115" rx="22" ry="18" fill="#e8c9a3" />
      <circle cx="82" cy="90" r="6" fill="#111" />
      <circle cx="118" cy="90" r="6" fill="#111" />
      <ellipse cx="100" cy="108" rx="6" ry="5" fill="#111" />
      <path d="M92 116 Q100 122 108 116" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function SnakeIllustration({ className }: AnimalProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Illustration of a snake">
      <path
        d="M40 140 C40 110 80 120 80 90 C80 60 40 65 40 40"
        stroke="#5a9e4a"
        strokeWidth="30"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="40" cy="40" r="20" fill="#5a9e4a" />
      <circle cx="33" cy="34" r="4" fill="#111" />
      <circle cx="47" cy="34" r="4" fill="#111" />
      <path d="M40 48 L34 58 M40 48 L46 58" stroke="#d1495b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BirdIllustration({ className }: AnimalProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Illustration of a bird">
      <ellipse cx="100" cy="120" rx="45" ry="50" fill="#e07a7a" />
      <ellipse cx="70" cy="115" rx="30" ry="18" fill="#c85a5a" transform="rotate(-25 70 115)" />
      <circle cx="100" cy="80" r="35" fill="#e07a7a" />
      <polygon points="100,80 130,88 100,96" fill="#e0a13a" />
      <circle cx="112" cy="76" r="5" fill="#111" />
      <ellipse cx="90" cy="150" rx="10" ry="20" fill="#fff" />
    </svg>
  );
}

export function CowIllustration({ className }: AnimalProps) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Illustration of a cow">
      <ellipse cx="100" cy="145" rx="60" ry="42" fill="#f5f0e6" />
      <ellipse cx="70" cy="130" rx="18" ry="14" fill="#222" />
      <ellipse cx="130" cy="155" rx="20" ry="16" fill="#222" />
      <circle cx="100" cy="90" r="45" fill="#f5f0e6" />
      <ellipse cx="100" cy="110" rx="25" ry="18" fill="#e79b9b" />
      <ellipse cx="72" cy="70" rx="10" ry="16" fill="#f5f0e6" transform="rotate(-20 72 70)" />
      <ellipse cx="128" cy="70" rx="10" ry="16" fill="#f5f0e6" transform="rotate(20 128 70)" />
      <circle cx="85" cy="85" r="5" fill="#111" />
      <circle cx="115" cy="85" r="5" fill="#111" />
    </svg>
  );
}
