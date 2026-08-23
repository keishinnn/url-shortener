import * as urlRepository from "../repository/url.repository.js";
import type { CreateShortenUrlInput, Url } from "../url.types.js";

export async function getShortenUrl(id: string) {
  return await urlRepository.findShortenUrlById(id);
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
