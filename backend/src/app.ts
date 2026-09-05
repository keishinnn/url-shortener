import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { urlRoutes } from "./features/shorten-url/url.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  app.register(cors, {
    origin: env.BASE_URL,
  });

  const redis = new Redis(env.REDIS_URL, {
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
  });

  await app.register(rateLimit, { global: false, redis });

  app.register(urlRoutes, {
    prefix: "/api",
  });

  return app;
}
