import Fastify from "fastify";
import cors from "@fastify/cors";
import { urlRoutes } from "./features/shorten-url/routes/url.routes.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin: "http://localhost:5173",
  });

  app.register(urlRoutes, {
    prefix: "/api",
  });

  return app;
}
