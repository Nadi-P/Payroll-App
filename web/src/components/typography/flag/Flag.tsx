import { flagStyles as s } from "./flag.styles";

export type FlagCode = "il" | "us" | "ru" | "arab-league";

interface FlagProps {
  code: FlagCode;
  size?: "sm" | "md";
}

const US_STARS = [0, 1, 2, 3, 4].flatMap((r) => [0, 1, 2, 3].map((c) => [1.4 + c * 2.3 + (r % 2) * 1.15, 1.3 + r * 1.75]));

/** A small national flag, drawn inline so it renders the same on every system. */
export function Flag({ code, size }: FlagProps) {
  return (
    <svg viewBox="0 0 24 18" aria-hidden className={s({ size })}>
      {code === "il" ? (
        <>
          <rect width="24" height="18" fill="#fff" />
          <rect y="2" width="24" height="2.4" fill="#0038b8" />
          <rect y="13.6" width="24" height="2.4" fill="#0038b8" />
          <path d="M12 5.7l2.86 4.95H9.14zM12 12.3l2.86-4.95H9.14z" fill="none" stroke="#0038b8" strokeWidth="0.85" />
        </>
      ) : null}
      {code === "us" ? (
        <>
          <rect width="24" height="18" fill="#b22234" />
          {[1, 3, 5, 7, 9, 11].map((i) => (
            <rect key={i} y={(i * 18) / 13} width="24" height={18 / 13} fill="#fff" />
          ))}
          <rect width="10.4" height={(7 * 18) / 13} fill="#3c3b6e" />
          {US_STARS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.42" fill="#fff" />
          ))}
        </>
      ) : null}
      {code === "ru" ? (
        <>
          <rect width="24" height="6" fill="#fff" />
          <rect y="6" width="24" height="6" fill="#0039a6" />
          <rect y="12" width="24" height="6" fill="#d52b1e" />
        </>
      ) : null}
      {code === "arab-league" ? (
        <>
          <rect width="24" height="18" fill="#00733a" />
          <circle cx="12" cy="9" r="5" fill="none" stroke="#fff" strokeWidth="0.8" strokeDasharray="1.1 0.7" />
          <circle cx="12" cy="9" r="3" fill="#fff" />
          <circle cx="12.9" cy="8.4" r="2.5" fill="#00733a" />
        </>
      ) : null}
    </svg>
  );
}
