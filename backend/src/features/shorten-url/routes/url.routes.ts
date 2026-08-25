import type { FastifyInstance } from "fastify";

import {
  createShortenUrl,
  getShortenUrl,
} from "../controller/url.controller.js";

export async function urlRoutes(app: FastifyInstance) {
  app.get("/shorten-url/:shortCode", getShortenUrl);

  app.post("/shorten-url", createShortenUrl);
}
