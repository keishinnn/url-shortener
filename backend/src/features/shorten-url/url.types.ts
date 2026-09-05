export type CreateShortenUrlInput = {
  originalUrl: string;
};

export type Url = {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: Date | null;
  expiresAt: Date | null;
};
