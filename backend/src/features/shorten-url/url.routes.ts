import type { FastifyInstance } from "fastify";

import { createShortenUrl, getShortenUrl } from "./url.controller.js";

export async function urlRoutes(app: FastifyInstance) {
  app.get(
    "/shorten-url/:shortCode",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    getShortenUrl,
  );

  app.post(
    "/shorten-url",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    createShortenUrl,
  );
}
