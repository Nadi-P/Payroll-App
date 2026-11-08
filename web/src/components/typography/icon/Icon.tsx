import { DIRECTIONAL, ICONS, type IconName } from "./icon.logic";
import { iconStyles, type IconVariants } from "./icon.styles";

interface IconProps extends Omit<IconVariants, "mirror"> {
  name: IconName;
}

export function Icon({ name, size, tone }: IconProps) {
  const Glyph = ICONS[name];
  return <Glyph aria-hidden className={iconStyles({ size, tone, mirror: DIRECTIONAL.has(name) })} />;
}
