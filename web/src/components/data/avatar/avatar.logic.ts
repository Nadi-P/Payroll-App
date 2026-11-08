export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** A stable color slot per name, so the same person always gets the same color. */
export function hueOf(name: string): 0 | 1 | 2 | 3 | 4 | 5 {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (hash % 6) as 0 | 1 | 2 | 3 | 4 | 5;
}
