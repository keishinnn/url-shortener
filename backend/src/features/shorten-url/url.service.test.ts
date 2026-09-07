import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";
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

function collisionError() {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on the fields: (`short_code`)",
    { code: "P2002", clientVersion: "test" },
  );
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

  it("returns trigger-generated shortCode when creating", async () => {
    vi.mocked(urlRepository.createShortenUrl).mockResolvedValue({
      shortCode: "a1b2c3d",
    } as never);

    const result = await createShortenUrl({
      originalUrl: "https://example.com/long",
    });

    expect(result).toEqual({ shortenUrl: "a1b2c3d" });
    expect(vi.mocked(urlRepository.createShortenUrl)).toHaveBeenCalledOnce();
    // DB trigger fills short_code, so only originalUrl is sent
    expect(vi.mocked(urlRepository.createShortenUrl)).toHaveBeenCalledWith({
      originalUrl: "https://example.com/long",
    });
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

  it("throws 500 when trigger did not generate a code", async () => {
    vi.mocked(urlRepository.createShortenUrl).mockResolvedValue({
      shortCode: null,
    } as never);

    const error = await createShortenUrl({
      originalUrl: "https://example.com/long",
    }).catch((err: unknown) => err);
    expect(statusCodeOf(error)).toBe(500);
  });

  it("rethrows repository errors without retrying", async () => {
    vi.mocked(urlRepository.createShortenUrl).mockRejectedValue(
      new Error("db down"),
    );

    await expect(
      createShortenUrl({ originalUrl: "https://example.com/long" }),
    ).rejects.toThrow("db down");
    expect(vi.mocked(urlRepository.createShortenUrl)).toHaveBeenCalledOnce();
  });

  it("retries a short-code collision and returns the fresh code", async () => {
    vi.mocked(urlRepository.createShortenUrl)
      .mockRejectedValueOnce(collisionError())
      .mockResolvedValueOnce({ shortCode: "b2c3d4e" } as never);

    const result = await createShortenUrl({
      originalUrl: "https://example.com/long",
    });

    expect(result).toEqual({ shortenUrl: "b2c3d4e" });
    expect(vi.mocked(urlRepository.createShortenUrl)).toHaveBeenCalledTimes(
      2,
    );
  });

  it("retries code-shaped errors without the Prisma class", async () => {
    vi.mocked(urlRepository.createShortenUrl)
      .mockRejectedValueOnce(
        Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
        }),
      )
      .mockResolvedValueOnce({ shortCode: "c3d4e5f" } as never);

    const result = await createShortenUrl({
      originalUrl: "https://example.com/long",
    });

    expect(result).toEqual({ shortenUrl: "c3d4e5f" });
  });

  it("throws 500 after exhausting collision retries", async () => {
    vi.mocked(urlRepository.createShortenUrl).mockRejectedValue(
      collisionError(),
    );

    const error = await createShortenUrl({
      originalUrl: "https://example.com/long",
    }).catch((err: unknown) => err);

    expect((error as Error).message).toBe(
      "Could not generate a unique short code",
    );
    expect(statusCodeOf(error)).toBe(500);
    expect(vi.mocked(urlRepository.createShortenUrl)).toHaveBeenCalledTimes(
      5,
    );
  });
});
