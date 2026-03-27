import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  ups: {
    clientId: requireEnv("UPS_CLIENT_ID"),
    clientSecret: requireEnv("UPS_CLIENT_SECRET"),
    baseUrl: requireEnv("UPS_BASE_URL"),
    authUrl: requireEnv("UPS_AUTH_URL"),
    accountNumber: requireEnv("UPS_ACCOUNT_NUMBER"),
  },
  env: process.env.NODE_ENV ?? "development",
};
