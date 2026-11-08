import { logoStyles as s } from "./logo.styles";

interface LogoProps {
  /** The product name, from messages. */
  name: string;
  /** Mark only, for tight spaces. */
  compact?: boolean;
}

/** Paypex mark: a rounded tile with a "P" whose bowl turns into a forward arrow. */
export function Logo({ name, compact }: LogoProps) {
  return (
    <span className={s.root}>
      <svg viewBox="0 0 32 32" aria-hidden className={s.mark}>
        <defs>
          <linearGradient id="paypex-tile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4cc8fa" />
            <stop offset="1" stopColor="#1bb2f7" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#paypex-tile)" />
        <path
          d="M11.5 24.5V8.5h6a5.25 5.25 0 0 1 0 10.5h-6"
          fill="none"
          stroke="#0b2540"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M19 22.5l3.5 2-3.5 2" fill="none" stroke="#0b2540" strokeOpacity="0.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {compact ? null : <span className={s.word}>{name}</span>}
    </span>
  );
}
