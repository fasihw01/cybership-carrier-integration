export interface Address {
  name: string;
  street: string;
  city: string;
  stateCode: string; 
  postalCode: string;
  countryCode: string; 
}

export interface Package {
  weightLbs: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

export interface RateRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  serviceCode?: string;
}

export interface RateQuote {
  carrier: string; 
  serviceCode: string;
  serviceName: string;
  totalChargeUsd: number;
  currencyCode: string;
  estimatedDays?: number;
}
