import Fastify, { type FastifyError } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { urlRoutes } from "./features/shorten-url/url.routes.js";

export type BuildAppOptions = {
  redisClient?: Redis | null;
  enableRateLimit?: boolean;
}

export async function buildApp(opts?: BuildAppOptions) {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      app.log.error(error);
      return reply.code(500).send({ message: "Internal Server Error" });
    }
    return reply.code(statusCode).send({ message: error.message });
  });

  app.register(cors, {
    origin: env.BASE_URL,
  });

  if (opts?.enableRateLimit !== false) {
    if (opts?.redisClient === null) {
      await app.register(rateLimit, { global: false });
    } else {
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
  }

  app.register(urlRoutes, {
    prefix: "/api",
  });

  return app;
}
