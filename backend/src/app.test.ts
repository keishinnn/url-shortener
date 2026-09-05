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

  it("POST returns 400 when body is missing originalUrl", async () => {
    const app = await buildApp({ enableRateLimit: false });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/shorten-url",
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("POST returns 400 when originalUrl is empty", async () => {
    const app = await buildApp({ enableRateLimit: false });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/shorten-url",
        payload: { originalUrl: "" },
      });

      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("POST returns 400 for invalid URL via service validation", async () => {
    vi.mocked(urlService.createShortenUrl).mockRejectedValue(
      Object.assign(new Error("Invalid URL"), { statusCode: 400 }),
    );

    const app = await buildApp({ enableRateLimit: false });
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/shorten-url",
        payload: { originalUrl: "notaurl" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ message: "Invalid URL" });
    } finally {
      await app.close();
    }
  });

  it("GET returns 404 for unknown shortCode", async () => {
    vi.mocked(urlService.getShortenUrl).mockRejectedValue(
      Object.assign(new Error("Short URL not found"), { statusCode: 404 }),
    );

    const app = await buildApp({ enableRateLimit: false });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/shorten-url/unknown1",
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ message: "Short URL not found" });
    } finally {
      await app.close();
    }
  });

  it("GET returns 400 for malformed shortCode param", async () => {
    const app = await buildApp({ enableRateLimit: false });
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/shorten-url/!!!",
      });

      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
