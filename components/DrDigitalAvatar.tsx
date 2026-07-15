interface DrDigitalAvatarProps {
  className?: string;
}

export default function DrDigitalAvatar({ className }: DrDigitalAvatarProps) {
  return (
    <svg
      viewBox="0 0 240 420"
      className={className}
      role="img"
      aria-label="Dr. Digital, a friendly striped robot character"
    >
      <defs>
        <clipPath id="dd-clip-head">
          <rect x="45" y="8" width="150" height="108" rx="24" />
        </clipPath>
        <clipPath id="dd-clip-torso">
          <circle cx="120" cy="222" r="98" />
        </clipPath>
        <clipPath id="dd-clip-base">
          <path d="M45 305 C45 293 55 288 68 288 L172 288 C185 288 195 293 195 305 L155 400 C145 418 95 418 85 400 Z" />
        </clipPath>
      </defs>

      <g clipPath="url(#dd-clip-head)">
        <rect x="45" y="8" width="50" height="108" fill="#e63946" />
        <rect x="95" y="8" width="50" height="108" fill="#2a9d5c" />
        <rect x="145" y="8" width="50" height="108" fill="#3a7bd5" />
      </g>
      <rect x="45" y="8" width="150" height="108" rx="24" fill="none" stroke="#111" strokeWidth="10" />

      <g clipPath="url(#dd-clip-torso)">
        <rect x="22" y="124" width="66" height="196" fill="#e63946" />
        <rect x="88" y="124" width="66" height="196" fill="#2a9d5c" />
        <rect x="154" y="124" width="66" height="196" fill="#3a7bd5" />
      </g>
      <circle cx="120" cy="222" r="98" fill="none" stroke="#111" strokeWidth="10" />

      <g clipPath="url(#dd-clip-base)">
        <rect x="45" y="288" width="50" height="130" fill="#e63946" />
        <rect x="95" y="288" width="50" height="130" fill="#2a9d5c" />
        <rect x="145" y="288" width="50" height="130" fill="#3a7bd5" />
      </g>
      <path
        d="M45 305 C45 293 55 288 68 288 L172 288 C185 288 195 293 195 305 L155 400 C145 418 95 418 85 400 Z"
        fill="none"
        stroke="#111"
        strokeWidth="10"
      />

      <path
        d="M80 40 L80 78 L160 78 L160 40"
        fill="none"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M96 176 A50 50 0 1 1 96 268"
        fill="none"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
      />

      <path
        d="M100 320 L120 355 L140 320"
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
