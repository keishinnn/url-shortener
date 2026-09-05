export type CreateShortenUrlInput = {
  originalUrl: string;
};

export type CreateShortenUrlData = CreateShortenUrlInput & {
  shortCode: string;
};

export type Url = {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: Date | null;
  expiresAt: Date | null;
};
