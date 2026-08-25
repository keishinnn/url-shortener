import type { CreateShortenUrlInput } from "../url.types.js";
import { prisma } from "../../../lib/prisma.js";

export async function createShortenUrl(data: CreateShortenUrlInput) {
  const created = await prisma.url.create({
    data,
  });

  return created;
}

export async function findShortenUrlByShortCode(shortCode: string) {
  const originalUrl = await prisma.url.findUnique({
    where: { shortCode },
  });

  return originalUrl;
}
