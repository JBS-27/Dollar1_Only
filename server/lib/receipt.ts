import { createHash, randomBytes } from "node:crypto";

/** Public soul id. No personal data is hashed in. */
export function createReceiptHash(input: {
  countryCode: string;
  createdAt: string;
  paymentMethod: string;
}): string {
  const nonce = randomBytes(16).toString("hex");
  const digest = createHash("sha256")
    .update(`$1Only|${input.countryCode}|${input.createdAt}|${input.paymentMethod}|${nonce}`)
    .digest("hex")
    .slice(0, 20)
    .toUpperCase();
  return `$1-${digest}`;
}
