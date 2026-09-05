import { describe, expect, it, vi } from "vitest";
import * as urlRepository from "./url.repository.js";
import {
  createShortenUrl,
  getShortenUrl,
} from "./url.service.js";

vi.mock("./url.repository.js", () => ({
  createShortenUrl: vi.fn(),
  findShortenUrlByShortCode: vi.fn(),
}));

describe("url.service", () => {
  it("returns originalUrl for a known shortCode", async () => {
    vi.mocked(urlRepository.findShortenUrlByShortCode).mockResolvedValue({
      originalUrl: "https://example.com/long",
    } as never);

    const result = await getShortenUrl("abc123");

    expect(result).toEqual({ originalUrl: "https://example.com/long" });
  });

  it("throws when shortCode is missing", async () => {
    await expect(getShortenUrl("")).rejects.toThrow("Short Code Required!");
  });

  it("returns shortCode when creating", async () => {
    vi.mocked(urlRepository.createShortenUrl).mockResolvedValue({
      shortCode: "abc123",
    } as never);

    const result = await createShortenUrl({
      originalUrl: "https://example.com/long",
    });

    expect(result).toEqual({ shortenUrl: "abc123" });
  });

  it("throws when originalUrl is blank", async () => {
    await expect(createShortenUrl({ originalUrl: "   " })).rejects.toThrow(
      "Original Url Required",
    );
  });
});
