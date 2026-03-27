import axios from "axios";
import { UpsAuthProvider } from "../../src/carriers/ups/UpsAuthProvider";
import tokenFixture from "../fixtures/auth-token.json";

describe("UpsAuthProvider", () => {
  let auth: UpsAuthProvider;
  let axiosPostSpy: jest.SpyInstance;

  beforeEach(() => {
    auth = new UpsAuthProvider();
    axiosPostSpy = jest.spyOn(axios, "post"); 
  });

  afterEach(() => {
    jest.restoreAllMocks(); 
  });

  it("fetches and returns a new token", async () => {
    axiosPostSpy.mockResolvedValueOnce({ data: tokenFixture });

    const token = await auth.getAccessToken();
    expect(token).toBe("test-access-token-xyz");
  });

  it("reuses cached token on second call", async () => {
    axiosPostSpy.mockResolvedValueOnce({ data: tokenFixture });

    await auth.getAccessToken();
    const token = await auth.getAccessToken(); 
    expect(token).toBe("test-access-token-xyz");
    expect(axiosPostSpy).toHaveBeenCalledTimes(1); 
  });

  it("refreshes token after cache is cleared", async () => {
    axiosPostSpy.mockResolvedValue({ data: tokenFixture });

    await auth.getAccessToken();
    auth.clearCache();
    const token = await auth.getAccessToken();
    expect(token).toBe("test-access-token-xyz");
    expect(axiosPostSpy).toHaveBeenCalledTimes(2); 
  });

  it("refreshes token after expiry", async () => {
    const nowSpy = jest.spyOn(Date, "now");

    nowSpy.mockReturnValueOnce(1_000_000);
    axiosPostSpy.mockResolvedValueOnce({ data: { access_token: "t1", expires_in: 10 } });
    const t1 = await auth.getAccessToken();
    expect(t1).toBe("t1");

    // After expiry (and beyond refresh buffer), it should fetch again
    nowSpy.mockReturnValueOnce(1_000_000 + 20_000);
    axiosPostSpy.mockResolvedValueOnce({ data: { access_token: "t2", expires_in: 10 } });
    const t2 = await auth.getAccessToken();
    expect(t2).toBe("t2");
    expect(axiosPostSpy).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it("throws PARSE_ERROR on malformed token payload", async () => {
    axiosPostSpy.mockResolvedValueOnce({ data: { nope: true } });

    await expect(auth.getAccessToken()).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });

  it("throws CarrierError on auth failure", async () => {
    const error = Object.assign(new Error("Unauthorized"), {
      isAxiosError: true,
      response: { status: 401, data: { error: "invalid_client" } },
    });
    axiosPostSpy.mockRejectedValueOnce(error);

    await expect(auth.getAccessToken()).rejects.toMatchObject({
      code: "AUTH_FAILED",
    });
  });
});
