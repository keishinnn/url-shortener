import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import * as urlService from "./features/shorten-url/url.service.js";

vi.mock("./features/shorten-url/url.service.js", () => ({
  createShortenUrl: vi.fn(),
  getShortenUrl: vi.fn(),
}));

describe("app routes", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("POST /api/shorten-url returns 201 without touching Redis/DB", async () => {
    vi.mocked(urlService.createShortenUrl).mockResolvedValue({
      shortenUrl: "abc123",
    });

    const app = await buildApp({ enableRateLimit: false });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/shorten-url",
        payload: { originalUrl: "https://example.com/long" },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({ shortenUrl: "abc123" });
    } finally {
      await app.close();
    }
  });

  it("GET /api/shorten-url/:shortCode returns 200", async () => {
    vi.mocked(urlService.getShortenUrl).mockResolvedValue({
      originalUrl: "https://example.com/long",
    });

    const app = await buildApp({ enableRateLimit: false });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/shorten-url/abc123",
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        originalUrl: "https://example.com/long",
      });
    } finally {
      await app.close();
    }
  });
});
