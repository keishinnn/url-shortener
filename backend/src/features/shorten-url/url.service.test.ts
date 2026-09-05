import { beforeEach, describe, expect, it, vi } from "vitest";
import * as urlRepository from "./url.repository.js";
import {
  createShortenUrl,
  getShortenUrl,
} from "./url.service.js";

vi.mock("./url.repository.js", () => ({
  createShortenUrl: vi.fn(),
  findShortenUrlByShortCode: vi.fn(),
}));

function statusCodeOf(error: unknown): number | undefined {
  return (error as { statusCode?: number })?.statusCode;
}

describe("url.service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns originalUrl for a known shortCode", async () => {
    vi.mocked(urlRepository.findShortenUrlByShortCode).mockResolvedValue({
      originalUrl: "https://example.com/long",
    } as never);

    const result = await getShortenUrl("abc123");

    expect(result).toEqual({ originalUrl: "https://example.com/long" });
  });

  it("throws 400 when shortCode is missing", async () => {
    const error = await getShortenUrl("").catch((err: unknown) => err);
    expect((error as Error).message).toBe("Short Code Required!");
    expect(statusCodeOf(error)).toBe(400);
  });

  it("throws 404 when shortCode is unknown", async () => {
    vi.mocked(urlRepository.findShortenUrlByShortCode).mockResolvedValue(
      null as never,
    );

    const error = await getShortenUrl("nope123").catch((err: unknown) => err);
    expect((error as Error).message).toBe("Short URL not found");
    expect(statusCodeOf(error)).toBe(404);
  });

  it("returns shortCode when creating", async () => {
    vi.mocked(urlRepository.createShortenUrl).mockResolvedValue({
      shortCode: "abc123",
    } as never);

    const result = await createShortenUrl({
      originalUrl: "https://example.com/long",
    });

    expect(result).toEqual({ shortenUrl: "abc123" });
    expect(vi.mocked(urlRepository.createShortenUrl)).toHaveBeenCalledOnce();
    const sent = vi.mocked(urlRepository.createShortenUrl).mock.calls[0]?.[0];
    expect(sent?.originalUrl).toBe("https://example.com/long");
    expect(sent?.shortCode).toMatch(/^[A-Za-z0-9]{7}$/);
  });

  it("trims the originalUrl before saving", async () => {
    vi.mocked(urlRepository.createShortenUrl).mockResolvedValue({
      shortCode: "abc123",
    } as never);

    await createShortenUrl({ originalUrl: "  https://example.com/long  " });

    const sent = vi.mocked(urlRepository.createShortenUrl).mock.calls[0]?.[0];
    expect(sent?.originalUrl).toBe("https://example.com/long");
  });

  it("throws 400 when originalUrl is blank", async () => {
    const error = await createShortenUrl({ originalUrl: "   " }).catch(
      (err: unknown) => err,
    );
    expect((error as Error).message).toBe("Original Url Required");
    expect(statusCodeOf(error)).toBe(400);
    expect(
      vi.mocked(urlRepository.createShortenUrl),
    ).not.toHaveBeenCalled();
  });

  it.each(["notaurl", "ftp://example.com/file", "javascript:alert(1)"])(
    "throws 400 for invalid URL %s",
    async (originalUrl) => {
      const error = await createShortenUrl({ originalUrl }).catch(
        (err: unknown) => err,
      );
      expect((error as Error).message).toBe("Invalid URL");
      expect(statusCodeOf(error)).toBe(400);
    },
  );

  it("retries with a fresh code on unique conflict", async () => {
    vi.mocked(urlRepository.createShortenUrl)
      .mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "P2002" }))
      .mockResolvedValueOnce({ shortCode: "retry01" } as never);

    const result = await createShortenUrl({
      originalUrl: "https://example.com/long",
    });

    expect(result).toEqual({ shortenUrl: "retry01" });
    expect(vi.mocked(urlRepository.createShortenUrl)).toHaveBeenCalledTimes(2);
  });

  it("rethrows non-conflict repository errors", async () => {
    vi.mocked(urlRepository.createShortenUrl).mockRejectedValue(
      new Error("db down"),
    );

    await expect(
      createShortenUrl({ originalUrl: "https://example.com/long" }),
    ).rejects.toThrow("db down");
  });
});
