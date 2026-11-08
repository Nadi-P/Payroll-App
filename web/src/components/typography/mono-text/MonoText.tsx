import { monoTextStyles } from "./monoText.styles";

/** Codes, formulas and raw values: monospaced and always left-to-right. */
export function MonoText({ value, block }: { value: string; block?: boolean }) {
  const Tag = block ? "div" : "bdi";
  return (
    <Tag dir="ltr" className={monoTextStyles({ block })}>
      {value}
    </Tag>
  );
}
