import { spinnerStyles } from "./spinner.styles";

export function Spinner({ size }: { size?: "sm" | "md" | "lg" }) {
  return <span role="status" aria-hidden className={spinnerStyles({ size })} />;
}
