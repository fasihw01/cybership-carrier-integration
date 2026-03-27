import axios from "axios";
import { AuthProvider } from "../base/authProvider";
import { CarrierError } from "../../domain/errors";
import { config } from "../../config/config";
import { UpsTokenResponseSchema } from "./ups.validation";

export class UpsAuthProvider implements AuthProvider {
  private token: string | null = null;
  private expiresAt: number = 0;

  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - 60_000) {
      return this.token;
    }
    return this.fetchNewToken();
  }

  private async fetchNewToken(): Promise<string> {
    try {
      const credentials = Buffer.from(
        `${config.ups.clientId}:${config.ups.clientSecret}`,
      ).toString("base64");

      const response = await axios.post(
        config.ups.authUrl,
        new URLSearchParams({ grant_type: "client_credentials" }),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 10_000,
        },
      );

      const validated = UpsTokenResponseSchema.safeParse(response.data);
      if (!validated.success) {
        throw new CarrierError(
          "PARSE_ERROR",
          "Malformed UPS token response",
          undefined,
          validated.error,
        );
      }

      this.token = validated.data.access_token;
      this.expiresAt = Date.now() + validated.data.expires_in * 1000;
      return this.token;
    } catch (err: unknown) {
      if (err instanceof CarrierError) {
        throw err;
      }
      throw new CarrierError(
        "AUTH_FAILED",
        "UPS token acquisition failed",
        axios.isAxiosError(err) ? err.response?.status : undefined,
        err,
      );
    }
  }

  clearCache(): void {
    this.token = null;
    this.expiresAt = 0;
  }
}
