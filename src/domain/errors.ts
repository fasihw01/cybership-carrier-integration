export type CarrierErrorCode =
  | "AUTH_FAILED"
  | "RATE_LIMIT"
  | "INVALID_REQUEST"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "PARSE_ERROR";

export class CarrierError extends Error {
  constructor(
    public readonly code: CarrierErrorCode,
    message: string,
    public readonly statusCode?: number,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "CarrierError";
  }
}
