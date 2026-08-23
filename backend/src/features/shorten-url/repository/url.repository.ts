import type { CreateShortenUrlInput } from "../url.types.js";
import { prisma } from "../../../lib/prisma.js";

export async function createShortenUrl(data: CreateShortenUrlInput) {
  const created = await prisma.url.create({
    data,
  });

  return created;
}

export function findShortenUrlById(id: string) {
  return prisma.url.findUnique({
    where: { id },
  });
}
