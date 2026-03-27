import axios from "axios";
import { CarrierAdapter } from "../base/carrierAdaptor";
import { UpsAuthProvider } from "./UpsAuthProvider";
import { RateRequest, RateQuote } from "../../domain/models";
import { CarrierError } from "../../domain/errors";
import { toUpsRateRequest, fromUpsRatedShipment } from "./ups.mapper";
import { RateRequestSchema } from "../../validation/schema";
import { config } from "../../config/config";
import { OperationRegistry } from "../base/operationRegistry";
import { UpsRateResponseSchema } from "./ups.validation";

export class UpsCarrierAdapter implements CarrierAdapter {
  readonly carrierId = "UPS";
  private readonly operations = new OperationRegistry();

  constructor(private readonly auth: UpsAuthProvider) {
    this.operations.register({
      id: "rates.shop",
      execute: (request: RateRequest) => this.getRates(request),
    });
  }

  execute<I, O>(operationId: string, input: I): Promise<O> {
    return this.operations.get<I, O>(operationId).execute(input);
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const parsed = RateRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new CarrierError("INVALID_REQUEST", parsed.error.message);
    }

    const token = await this.auth.getAccessToken();

    const upsPayload = toUpsRateRequest(request);

    try {
      const response = await axios.post(
        `${config.ups.baseUrl}/api/rating/v2409/Shop`,
        upsPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            transId: `txn-${Date.now()}`,
            transactionSrc: "cybership",
          },
          timeout: parseInt(process.env.AXIOS_TIMEOUT ?? "15000", 10),
        },
      );
      const validated = UpsRateResponseSchema.safeParse(response.data);
      if (!validated.success) {
        throw new CarrierError(
          "PARSE_ERROR",
          "Malformed UPS rate response",
          undefined,
          validated.error,
        );
      }

      return validated.data.RateResponse.RatedShipment.map(fromUpsRatedShipment);
    } catch (err: unknown) {
      if (err instanceof CarrierError) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          throw new CarrierError(
            "TIMEOUT",
            "UPS request timed out or network unreachable",
          );
        }

        const status = err.response.status;

        if (status === 401 || status === 403) {
          throw new CarrierError(
            "AUTH_FAILED",
            "UPS auth rejected",
            status,
            err.response.data,
          );
        }
        if (status === 429) {
          throw new CarrierError(
            "RATE_LIMIT",
            "UPS rate limit exceeded",
            429,
            err.response.data,
          );
        }
        if (status >= 400 && status < 500) {
          throw new CarrierError(
            "INVALID_REQUEST",
            "UPS rejected the request",
            status,
            err.response.data,
          );
        }

        throw new CarrierError(
          "UPSTREAM_ERROR",
          "UPS server error",
          status,
          err.response.data,
        );
      }

      throw new CarrierError(
        "PARSE_ERROR",
        "Unexpected error processing UPS response",
        undefined,
        err,
      );
    }
  }
}
