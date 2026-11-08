import { skeletonGroup, skeletonStyles } from "./skeleton.styles";

interface SkeletonProps {
  shape?: "line" | "title" | "block" | "tall" | "chip";
  count?: number;
}

export function Skeleton({ shape, count = 1 }: SkeletonProps) {
  return (
    <div aria-hidden className={skeletonGroup}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={skeletonStyles({ shape })} />
      ))}
    </div>
  );
}
