function EnergyStarLogo({ className = "energy-star-logo" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 843 620"
      role="img"
      aria-label="Logotipo de Energy Star"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fillRule="evenodd">
        <path
          fill="#F5F7F4"
          d="M180 102h335l-63 52H180zM198 198h206l-56 49H217l-21 42h174l-34 48H102z"
        />
        <path fill="#39FF14" d="M522 171h168l-41 40H490z" />
        <path
          fill="#39FF14"
          d="M455 248h146c49 0 77 25 77 65 0 41-31 72-77 72H356l57-45h182c19 0 34-11 34-27 0-13-12-21-31-21H430z"
        />
        <path fill="#39FF14" d="m550 97-183 170h49L294 414l176-188h-49z" />
        <path
          fill="#39FF14"
          d="M586 8c5 91 16 111 104 121-88 10-99 30-104 121-6-91-17-111-105-121C569 119 580 99 586 8Z"
        />
        <path
          fill="#E8FFE2"
          d="M586 65c3 47 9 57 55 64-46 6-52 17-55 64-3-47-9-58-55-64 46-7 52-17 55-64Z"
        />
      </g>
      <text
        x="421"
        y="514"
        fill="#F5F7F4"
        fontFamily="Space Grotesk, Arial, sans-serif"
        fontSize="85"
        fontWeight="600"
        letterSpacing="15"
        textAnchor="middle"
        textLength="815"
        lengthAdjust="spacingAndGlyphs"
      >
        ENERGY
      </text>
      <path d="M53 565h105M683 565h107" stroke="#39FF14" strokeWidth="5" />
      <text
        x="421"
        y="587"
        fill="#39FF14"
        fontFamily="Space Grotesk, Arial, sans-serif"
        fontSize="55"
        fontWeight="500"
        letterSpacing="18"
        textAnchor="middle"
        textLength="470"
        lengthAdjust="spacingAndGlyphs"
      >
        STAR
      </text>
    </svg>
  );
}

export default EnergyStarLogo;

