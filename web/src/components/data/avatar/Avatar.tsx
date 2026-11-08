import { hueOf, initials } from "./avatar.logic";
import { avatarStyles } from "./avatar.styles";

export function Avatar({ name, size }: { name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <span aria-hidden className={avatarStyles({ size, hue: hueOf(name) })}>
      {initials(name)}
    </span>
  );
}
