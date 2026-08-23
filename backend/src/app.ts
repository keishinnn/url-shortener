import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { urlRoutes } from "./features/shorten-url/routes/url.routes.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin: env.BASE_URL,
  });

  app.register(urlRoutes, {
    prefix: "/api",
  });

  return app;
}
