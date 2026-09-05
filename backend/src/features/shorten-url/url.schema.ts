import type { FastifySchema } from "fastify";

export const createShortenUrlSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["originalUrl"],
    additionalProperties: false,
    properties: {
      originalUrl: { type: "string", minLength: 1, maxLength: 2048 },
    },
  },
};

export const getShortenUrlSchema: FastifySchema = {
  params: {
    type: "object",
    required: ["shortCode"],
    additionalProperties: false,
    properties: {
      shortCode: {
        type: "string",
        minLength: 1,
        maxLength: 10,
        pattern: "^[A-Za-z0-9_-]+$",
      },
    },
  },
};
