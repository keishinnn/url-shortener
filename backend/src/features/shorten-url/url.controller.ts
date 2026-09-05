import type { FastifyReply, FastifyRequest } from "fastify";
import * as urlService from "./url.service.js";

export async function getShortenUrl(
  request: FastifyRequest<{
    Params: {
      shortCode: string;
    };
  }>,
  reply: FastifyReply,
) {
  const url = await urlService.getShortenUrl(request.params.shortCode);

  return reply.send(url);
}

export async function createShortenUrl(
  request: FastifyRequest<{
    Body: {
      originalUrl: string;
    };
  }>,
  reply: FastifyReply,
) {
  const originalUrl = await urlService.createShortenUrl({
    originalUrl: request.body.originalUrl,
  });

  return reply.status(201).send(originalUrl);
}
