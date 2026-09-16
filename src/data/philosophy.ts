/** Short lines that rotate inside a country pin. Never mention amounts other than $1. */
export const PIN_LINES = [
  "One dollar. One soul. One signal.",
  "Equality needs no more than this.",
  "The smallest act, held in common.",
  "Nothing added. Nothing taken. $1 Only.",
  "A single clean unit of belief.",
  "The same gesture, from every latitude.",
  "Not charity as spectacle. A quiet yes.",
  "Exactly one. That is the whole poem.",
] as const;

export function lineForCountry(code: string): string {
  const total = PIN_LINES.reduce((sum, line, i) => sum + line.charCodeAt(0) * (i + 1) + code.charCodeAt(0), 0);
  return PIN_LINES[total % PIN_LINES.length];
}

export const WHY_BODY = [
  "$1 Only is a refusal of more.",
  "The charge is a fixed $1.50 so that after processing fees, the creator receives a clean ~$1. The extra exists only to keep the dollar intact — not to climb, not to tip, not to compete.",
  "No one can give more. No one can give less. The amount is the entire message: a pure equal signal of belief and collective human spirit.",
  "Each participation is stored as a country, a time, a method, and a soul hash. No names. No emails. No ranks.",
  "When a country awakens, a $1 pin appears on the living Earth. That is the whole monument.",
] as const;
