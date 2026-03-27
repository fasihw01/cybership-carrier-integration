import axios from "axios";
import { UpsCarrierAdapter } from "../../src/carriers/ups/UpsCarrierAdaptor";
import { UpsAuthProvider } from "../../src/carriers/ups/UpsAuthProvider";
import { RateRequest } from "../../src/domain/models";
import rateSuccess from "../fixtures/rate-success.json";
import rateError from "../fixtures/rate-error-400.json";
import { toUpsRateRequest } from "../../src/carriers/ups/ups.mapper";
import { config } from "../../src/config/config";

const mockRequest: RateRequest = {
  origin: {
    name: "Sender",
    street: "123 Main St",
    city: "Los Angeles",
    stateCode: "CA",
    postalCode: "90001",
    countryCode: "US",
  },
  destination: {
    name: "Recipient",
    street: "456 Park Ave",
    city: "New York",
    stateCode: "NY",
    postalCode: "10001",
    countryCode: "US",
  },
  packages: [{ weightLbs: 5, lengthIn: 10, widthIn: 8, heightIn: 6 }],
};

describe("UpsCarrierAdapter - getRates", () => {
  let adapter: UpsCarrierAdapter;
  let auth: UpsAuthProvider;
  let axiosPostSpy: jest.SpyInstance;

  beforeEach(() => {
    auth = new UpsAuthProvider();
    jest.spyOn(auth, "getAccessToken").mockResolvedValue("mock-token");
    adapter = new UpsCarrierAdapter(auth);

    axiosPostSpy = jest.spyOn(axios, "post");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns normalized rate quotes on success", async () => {
    axiosPostSpy.mockResolvedValueOnce({ data: rateSuccess });

    const quotes = await adapter.getRates(mockRequest);

    expect(axiosPostSpy).toHaveBeenCalledWith(
      `${config.ups.baseUrl}/api/rating/v2409/Shop`,
      toUpsRateRequest(mockRequest),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
          transactionSrc: "cybership",
          transId: expect.stringMatching(/^txn-/),
        }),
        timeout: expect.any(Number),
      }),
    );

    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({
      carrier: "UPS",
      serviceCode: "03",
      serviceName: "UPS Ground",
      totalChargeUsd: 12.5,
      currencyCode: "USD",
    });
  });

  it("builds a Rate request when serviceCode is provided", async () => {
    axiosPostSpy.mockResolvedValueOnce({ data: rateSuccess });
    const req: RateRequest = { ...mockRequest, serviceCode: "03" };

    await adapter.getRates(req);

    const payload = toUpsRateRequest(req);
    expect(payload.RateRequest.Request.RequestOption).toBe("Rate");
    expect(payload.RateRequest.Shipment.Service).toMatchObject({ Code: "03" });
  });

  it("throws INVALID_REQUEST on 400", async () => {
    const error = Object.assign(new Error("Request failed"), {
      isAxiosError: true,
      response: { status: 400, data: rateError },
    });
    axiosPostSpy.mockRejectedValueOnce(error);

    await expect(adapter.getRates(mockRequest)).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      statusCode: 400,
    });
  });

  it("throws RATE_LIMIT on 429", async () => {
    const error = Object.assign(new Error("Too many requests"), {
      isAxiosError: true,
      response: { status: 429, data: {} },
    });
    axiosPostSpy.mockRejectedValueOnce(error);

    await expect(adapter.getRates(mockRequest)).rejects.toMatchObject({
      code: "RATE_LIMIT",
    });
  });

  it("throws UPSTREAM_ERROR on 5xx", async () => {
    const error = Object.assign(new Error("Server error"), {
      isAxiosError: true,
      response: { status: 500, data: { message: "oops" } },
    });
    axiosPostSpy.mockRejectedValueOnce(error);

    await expect(adapter.getRates(mockRequest)).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
      statusCode: 500,
    });
  });

  it("throws TIMEOUT on network failure", async () => {
    const error = Object.assign(new Error("connect ECONNREFUSED"), {
      isAxiosError: true,
      response: undefined,
    });
    axiosPostSpy.mockRejectedValueOnce(error);

    await expect(adapter.getRates(mockRequest)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("throws PARSE_ERROR on malformed success payload", async () => {
    axiosPostSpy.mockResolvedValueOnce({ data: { not: "ups" } });

    await expect(adapter.getRates(mockRequest)).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });

  it("throws PARSE_ERROR on unexpected non-axios error", async () => {
    axiosPostSpy.mockRejectedValueOnce(new SyntaxError("Unexpected token <"));

    await expect(adapter.getRates(mockRequest)).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });

  it("throws INVALID_REQUEST on Zod validation failure", async () => {
    const bad = { ...mockRequest, packages: [] };
    await expect(adapter.getRates(bad)).rejects.toMatchObject({
      code: "INVALID_REQUEST",
    });
  });
});
