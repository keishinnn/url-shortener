import * as urlRepository from "./url.repository.js";
import { generateShortCode } from "./url.short-code.js";
import type { CreateShortenUrlInput } from "./url.types.js";

const MAX_CREATE_ATTEMPTS = 3;

function badRequest(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function notFound(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 404 });
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function assertHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw badRequest("Original Url Required");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw badRequest("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw badRequest("Invalid URL");
  }
  return trimmed;
}

export async function getShortenUrl(shortCode: string) {
  if (!shortCode || shortCode.trim().length === 0) {
    throw badRequest("Short Code Required!");
  }

  const url = await urlRepository.findShortenUrlByShortCode(shortCode);

  if (!url || !url.originalUrl) {
    throw notFound("Short URL not found");
  }

  return {
    originalUrl: url.originalUrl,
  };
}

export async function createShortenUrl(data: CreateShortenUrlInput) {
  const originalUrl = assertHttpUrl(data?.originalUrl ?? "");

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const shortCode = generateShortCode();
    try {
      const url = await urlRepository.createShortenUrl({
        originalUrl,
        shortCode,
      });

      return {
        shortenUrl: url.shortCode ?? shortCode,
      };
    } catch (error) {
      if (isUniqueConflict(error) && attempt < MAX_CREATE_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }

  throw badRequest("Could not generate a unique short URL, try again");
}
