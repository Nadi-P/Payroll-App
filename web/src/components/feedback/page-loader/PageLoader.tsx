import { pageLoaderStyles as s } from "./pageLoader.styles";

interface PageLoaderProps {
  visible: boolean;
  /** Accessible description, e.g. "Loading". */
  label: string;
}

/** The Paypex "P" being traced by a moving stroke, shown while a page loads. */
export function PageLoader({ visible, label }: PageLoaderProps) {
  if (!visible) return null;
  return (
    <div role="status" aria-label={label} className={s.root}>
      <div className={s.mark}>
        <svg viewBox="0 0 48 48" aria-hidden className={s.svg}>
          <rect x="3" y="3" width="42" height="42" rx="13" className={s.tile} />
          <path d="M18 35V13h8.5a7.25 7.25 0 0 1 0 14.5H18" pathLength={100} className={s.track} />
          <path d="M18 35V13h8.5a7.25 7.25 0 0 1 0 14.5H18" pathLength={100} className={s.trace} />
          <path d="M29 33l4.5 2.5L29 38" pathLength={100} className={s.arrow} />
        </svg>
        <div className={s.glow} />
      </div>
      <div className={s.bar}>
        <div className={s.barFill} />
      </div>
    </div>
  );
}
