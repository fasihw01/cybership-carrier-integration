import { z } from "zod";

export const UpsTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

export const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    RatedShipment: z
      .array(
        z.object({
          Service: z.object({ Code: z.string().min(1) }),
          TotalCharges: z.object({
            MonetaryValue: z.string().min(1),
            CurrencyCode: z.string().min(1),
          }),
          TimeInTransit: z
            .object({
              ServiceSummary: z
                .object({
                  EstimatedArrival: z
                    .object({
                      BusinessDaysInTransit: z.string().min(1),
                    })
                    .optional(),
                })
                .optional(),
            })
            .optional(),
        }),
      )
      .min(1),
  }),
});

export type UpsTokenResponse = z.infer<typeof UpsTokenResponseSchema>;

