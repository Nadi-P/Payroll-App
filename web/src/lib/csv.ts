/** One CSV field. Excel reads this format directly; quotes protect commas and line breaks. */
export function csvField(value: string | number): string {
  const text = String(value);
  // A leading =, +, - or @ would make a spreadsheet treat the text as a formula.
  const safe = typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Download rows as a CSV file that opens in Excel with Hebrew and Arabic intact. */
export function downloadCsv(fileName: string, lines: (string | number)[][]): void {
  const body = lines.map((line) => line.map(csvField).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", body], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Money and numbers rounded to agorot, so exported totals match what is on screen. */
export const round2 = (value: number) => Math.round(value * 100) / 100;
