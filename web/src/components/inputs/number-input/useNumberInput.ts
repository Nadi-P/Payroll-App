import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const ALLOWED = /^-?\d*(\.\d*)?$/;

/** Normalize to a decimal string the engine accepts, or null for an empty field. */
export function normalizeDecimal(raw: string): string | null {
  const text = raw.replace(/,/g, "").trim();
  if (text === "" || text === "-" || text === ".") return null;
  const n = Number(text);
  return Number.isFinite(n) ? text.replace(/^(-?)0+(\d)/, "$1$2").replace(/\.$/, "") : null;
}

export function useNumberInput(opts: {
  value: string | null | undefined;
  onCommit: (value: string | null) => void;
  onCancel?: () => void;
  initialText?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(opts.initialText ?? opts.value ?? "");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused && opts.initialText === undefined) setText(opts.value ?? "");
  }, [opts.value, focused, opts.initialText]);

  useEffect(() => {
    if (!opts.autoFocus) return;
    const input = ref.current;
    input?.focus();
    if (opts.initialText === undefined) input?.select();
    else input?.setSelectionRange(input.value.length, input.value.length);
  }, [opts.autoFocus, opts.initialText]);

  const commit = () => {
    const next = normalizeDecimal(text);
    if (next !== (opts.value ?? null)) opts.onCommit(next);
    setText(next ?? "");
  };

  return {
    ref,
    text,
    onChange: (raw: string) => {
      if (ALLOWED.test(raw.replace(/,/g, ""))) setText(raw);
    },
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      commit();
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ref.current?.blur(); // blur commits
      } else if (e.key === "Escape") {
        e.preventDefault();
        setText(opts.value ?? "");
        opts.onCancel?.();
      }
    },
  };
}
