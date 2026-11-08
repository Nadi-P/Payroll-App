import { kbdStyles } from "./kbd.styles";

export function Kbd({ keys }: { keys: string }) {
  return <kbd className={kbdStyles}>{keys}</kbd>;
}
