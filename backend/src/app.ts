import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { urlRoutes } from "./features/shorten-url/url.routes.js";

export type BuildAppOptions = {
  redisClient?: Redis;
  enableRateLimit?: boolean;
}

export async function buildApp(opts?: BuildAppOptions) {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  app.register(cors, {
    origin: env.BASE_URL,
  });

  if (opts?.enableRateLimit !== false) {
    const redis =
      opts?.redisClient ??
      new Redis(env.REDIS_URL, {
        connectTimeout: 500,
        maxRetriesPerRequest: 1,
      });

    await app.register(rateLimit, { global: false, redis });

    if (!opts?.redisClient) {
      app.addHook("onClose", async () => {
        redis.disconnect();
      });
    }
  }

  app.register(urlRoutes, {
    prefix: "/api",
  });

  return app;
}
