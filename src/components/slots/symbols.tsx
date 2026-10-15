import type { SlotSymbol } from "@/lib/slots/config";

/** Points of a five pointed star around (cx, cy). */
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return points.join(" ");
}

const STAR = starPoints(50, 53, 42, 18);
const STAR_INNER = starPoints(50, 53, 30, 12);

/**
 * Colours the symbols share. Rendered once per page: the symbols below point at these ids, so
 * the page does not carry a copy of every gradient for each of the cells on the reels.
 */
export function SlotSymbolDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <radialGradient id="sl-cherry" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ff7a86" />
          <stop offset="0.45" stopColor="#e11d3f" />
          <stop offset="1" stopColor="#8f0a24" />
        </radialGradient>
        <linearGradient id="sl-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fdc5a" />
          <stop offset="1" stopColor="#2f8f2f" />
        </linearGradient>
        <linearGradient id="sl-lemon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff48a" />
          <stop offset="0.55" stopColor="#ffd90f" />
          <stop offset="1" stopColor="#e0a800" />
        </linearGradient>
        <linearGradient id="sl-bell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0a0" />
          <stop offset="0.5" stopColor="#ffc928" />
          <stop offset="1" stopColor="#c98200" />
        </linearGradient>
        <linearGradient id="sl-clover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ee37e" />
          <stop offset="1" stopColor="#1f9d4c" />
        </linearGradient>
        <linearGradient id="sl-star" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff7b0" />
          <stop offset="0.5" stopColor="#ffd23a" />
          <stop offset="1" stopColor="#e69500" />
        </linearGradient>
        <linearGradient id="sl-diamond-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b8f1ff" />
          <stop offset="0.5" stopColor="#3cc4f2" />
          <stop offset="1" stopColor="#1b6fd1" />
        </linearGradient>
        <linearGradient id="sl-diamond-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e8fbff" />
          <stop offset="1" stopColor="#7fd8f7" />
        </linearGradient>
        <linearGradient id="sl-seven" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6a6a" />
          <stop offset="0.5" stopColor="#e5162e" />
          <stop offset="1" stopColor="#8d0618" />
        </linearGradient>
        <linearGradient id="sl-scatter" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb3f0" />
          <stop offset="0.5" stopColor="#d338e6" />
          <stop offset="1" stopColor="#6f1a85" />
        </linearGradient>
        <linearGradient id="sl-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2a0" />
          <stop offset="0.55" stopColor="#ffc928" />
          <stop offset="1" stopColor="#c98200" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const SHAPES: Record<SlotSymbol, React.ReactNode> = {
  cherry: (
    <>
      <path
        d="M52 20 C50 40 38 54 30 66"
        stroke="#4d8a24"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M52 20 C56 40 66 52 70 64"
        stroke="#4d8a24"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M52 20 C62 8 80 9 90 19 C78 27 62 27 52 20Z"
        fill="url(#sl-leaf)"
        stroke="#2a7a2a"
        strokeWidth="1.5"
      />
      <circle cx="30" cy="73" r="19" fill="url(#sl-cherry)" stroke="#7a0a1f" strokeWidth="1.5" />
      <circle cx="70" cy="71" r="19" fill="url(#sl-cherry)" stroke="#7a0a1f" strokeWidth="1.5" />
      <ellipse
        cx="23"
        cy="66"
        rx="5.5"
        ry="3.2"
        transform="rotate(-35 23 66)"
        fill="#fff"
        opacity="0.6"
      />
      <ellipse
        cx="63"
        cy="64"
        rx="5.5"
        ry="3.2"
        transform="rotate(-35 63 64)"
        fill="#fff"
        opacity="0.6"
      />
    </>
  ),
  lemon: (
    <>
      <g transform="rotate(-18 50 54)">
        <path
          d="M6 54 C13 54 16 52 20 46 C30 26 70 26 80 46 C84 52 87 54 94 54 C87 54 84 56 80 62 C70 82 30 82 20 62 C16 56 13 54 6 54Z"
          fill="url(#sl-lemon)"
          stroke="#b58a00"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <ellipse
          cx="38"
          cy="44"
          rx="13"
          ry="5"
          transform="rotate(-12 38 44)"
          fill="#fff"
          opacity="0.55"
        />
      </g>
      <path
        d="M62 24 C70 14 84 14 90 20 C82 28 70 30 62 24Z"
        fill="url(#sl-leaf)"
        stroke="#2a7a2a"
        strokeWidth="1.5"
      />
    </>
  ),
  bell: (
    <>
      <path
        d="M50 10 C44 10 40 14 40 19 C26 25 22 43 22 57 C22 66 16 70 13 75 L87 75 C84 70 78 66 78 57 C78 43 74 25 60 19 C60 14 56 10 50 10Z"
        fill="url(#sl-bell)"
        stroke="#9a6a00"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M38 80 H62 C62 89 56 93 50 93 C44 93 38 89 38 80Z"
        fill="#d89000"
        stroke="#9a6a00"
        strokeWidth="2"
      />
      <path
        d="M34 34 C30 44 30 54 31 62"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  clover: (
    <>
      <path
        d="M50 52 C51 68 58 80 68 88"
        stroke="#1b7a3a"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      {[0, 90, 180, 270].map((angle) => (
        <path
          key={angle}
          transform={`rotate(${angle} 50 50)`}
          d="M50 50 C50 50 34 40 34 27 C34 16 47 12 50 25 C53 12 66 16 66 27 C66 40 50 50 50 50Z"
          fill="url(#sl-clover)"
          stroke="#12693a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      <circle cx="50" cy="50" r="3.5" fill="#d9ffd0" opacity="0.8" />
    </>
  ),
  star: (
    <>
      <polygon
        points={STAR}
        fill="url(#sl-star)"
        stroke="#b86e00"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <polygon points={STAR_INNER} fill="#fff" opacity="0.22" />
    </>
  ),
  diamond: (
    <>
      <polygon
        points="30,14 70,14 90,38 10,38"
        fill="url(#sl-diamond-b)"
        stroke="#1b6fd1"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <polygon
        points="10,38 90,38 50,92"
        fill="url(#sl-diamond-a)"
        stroke="#1b6fd1"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M30 14 L40 38 L50 92 M70 14 L60 38 L50 92 M50 14 L40 38 M50 14 L60 38"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
    </>
  ),
  scatter: (
    <>
      <rect
        x="15"
        y="44"
        width="70"
        height="44"
        rx="6"
        fill="url(#sl-scatter)"
        stroke="#5a1470"
        strokeWidth="3"
      />
      <rect
        x="10"
        y="30"
        width="80"
        height="19"
        rx="5"
        fill="url(#sl-scatter)"
        stroke="#5a1470"
        strokeWidth="3"
      />
      <rect
        x="44"
        y="30"
        width="12"
        height="58"
        fill="url(#sl-coin)"
        stroke="#9a6a00"
        strokeWidth="2"
      />
      <path
        d="M50 30 C34 6 14 18 30 30Z M50 30 C66 6 86 18 70 30Z"
        fill="url(#sl-coin)"
        stroke="#9a6a00"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M18 18 L20.5 24 L26 26.5 L20.5 29 L18 35 L15.5 29 L10 26.5 L15.5 24Z"
        fill="#fff6c2"
      />
      <path
        d="M82 12 L83.8 16.2 L88 18 L83.8 19.8 L82 24 L80.2 19.8 L76 18 L80.2 16.2Z"
        fill="#fff6c2"
      />
    </>
  ),
  seven: (
    <>
      <polygon
        points="16,14 84,14 84,31 52,88 32,88 62,32 16,32"
        fill="url(#sl-seven)"
        stroke="#ffd23a"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <polygon points="22,19 78,19 78,22 22,22" fill="#fff" opacity="0.5" />
    </>
  ),
};

/** One reel symbol. Needs `SlotSymbolDefs` somewhere on the page for its colours. */
export function SlotSymbolIcon({
  symbol,
  className,
  title,
}: {
  symbol: SlotSymbol;
  className?: string;
  /** Accessible name; the symbol is decorative when it is left out. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {SHAPES[symbol]}
    </svg>
  );
}

/** A coin for the balance and the bet. */
export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="44" fill="url(#sl-coin)" stroke="#9a6a00" strokeWidth="5" />
      <circle
        cx="50"
        cy="50"
        r="31"
        fill="none"
        stroke="#9a6a00"
        strokeOpacity="0.55"
        strokeWidth="4"
      />
      <path
        d="M50 30 L56 44 L71 45 L59.5 55 L63 70 L50 62 L37 70 L40.5 55 L29 45 L44 44Z"
        fill="#fff6c2"
        opacity="0.9"
      />
    </svg>
  );
}
