import { useId } from "react";

/** Label and control are linked by id rather than nesting: a <label> wrapping a button
 * forwards the click to it a second time, which would toggle the switch back. */
export function useSwitch() {
  return { id: useId() };
}
