import { describe, expect, it } from "vitest";
import {
  generateShortCode,
  SHORT_CODE_LENGTH,
} from "./url.short-code.js";

describe("generateShortCode", () => {
  it(`defaults to ${SHORT_CODE_LENGTH} url-safe characters`, () => {
    expect(generateShortCode()).toMatch(/^[A-Za-z0-9]{7}$/);
  });

  it("respects a custom length", () => {
    expect(generateShortCode(10)).toMatch(/^[A-Za-z0-9]{10}$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateShortCode()));
    expect(codes.size).toBe(1000);
  });
});
