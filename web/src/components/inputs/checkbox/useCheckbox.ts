import { useId } from "react";

/** Label and control are linked by id rather than nesting (see useSwitch). */
export function useCheckbox() {
  return { id: useId() };
}
