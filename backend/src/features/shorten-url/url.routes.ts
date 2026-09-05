import type { FastifyInstance } from "fastify";

import { createShortenUrl, getShortenUrl } from "./url.controller.js";
import {
  createShortenUrlSchema,
  getShortenUrlSchema,
} from "./url.schema.js";

export async function urlRoutes(app: FastifyInstance) {
  app.get(
    "/shorten-url/:shortCode",
    {
      schema: getShortenUrlSchema,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    getShortenUrl,
  );

  app.post(
    "/shorten-url",
    {
      schema: createShortenUrlSchema,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    createShortenUrl,
  );
}
