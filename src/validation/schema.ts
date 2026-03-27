import { z } from "zod";

export const AddressSchema = z.object({
  name: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  stateCode: z.string().length(2),
  postalCode: z.string().min(5),
  countryCode: z.string().length(2),
});

export const PackageSchema = z.object({
  weightLbs: z.number().positive(),
  lengthIn: z.number().positive(),
  widthIn: z.number().positive(),
  heightIn: z.number().positive(),
});

export const RateRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1, "At least one package is required"),
  serviceCode: z.string().optional(),
});
