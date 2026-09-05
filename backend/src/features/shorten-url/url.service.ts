import * as urlRepository from "./url.repository.js";
import type { CreateShortenUrlInput, Url } from "./url.types.js";

export async function getShortenUrl(shortCode: string) {
  if (!shortCode) {
    throw new Error("Short Code Required!");
  }

  const url = await urlRepository.findShortenUrlByShortCode(shortCode);

  return {
    originalUrl: url?.originalUrl,
  };
}

export async function createShortenUrl(data: CreateShortenUrlInput) {
  if (data.originalUrl.trim().length == 0) {
    throw new Error("Original Url Required");
  }

  const url = await urlRepository.createShortenUrl(data);

  return {
    shortenUrl: url.shortCode,
  };
}
