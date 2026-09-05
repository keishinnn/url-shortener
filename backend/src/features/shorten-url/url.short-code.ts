import { randomBytes } from "node:crypto";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const SHORT_CODE_LENGTH = 7;

export function generateShortCode(length: number = SHORT_CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] as number;
    out += ALPHABET[byte % ALPHABET.length] as string;
  }
  return out;
}
