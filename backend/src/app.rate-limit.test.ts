import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import * as urlService from "./features/shorten-url/url.service.js";

vi.mock("./features/shorten-url/url.service.js", () => ({
  createShortenUrl: vi.fn(),
  getShortenUrl: vi.fn(),
}));

describe("rate limiting (in-memory store)", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns 429 after exceeding max requests per minute", async () => {
    vi.mocked(urlService.createShortenUrl).mockResolvedValue({
      shortenUrl: "abc123",
    });

    const app = await buildApp({ enableRateLimit: true, redisClient: null });
    try {
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/shorten-url",
          payload: { originalUrl: "https://example.com/long" },
        });
        expect(res.statusCode).toBe(201);
      }

      const limited = await app.inject({
        method: "POST",
        url: "/api/shorten-url",
        payload: { originalUrl: "https://example.com/long" },
      });

      expect(limited.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });
});
