import "dotenv/config";

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  PORT: Number(process.env.PORT) || 3000,
  BASE_URL: process.env.BASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,
};
