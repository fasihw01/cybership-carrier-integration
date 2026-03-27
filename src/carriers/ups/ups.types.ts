export interface UpsRateRequest {
  RateRequest: {
    Request: { RequestOption: string };
    Shipment: {
      Shipper: {
        Name: string;
        ShipperNumber: string;
        Address: UpsAddress;
      };
      ShipTo: {
        Name: string;
        Address: UpsAddress;
      };
      ShipFrom: {
        Name: string;
        Address: UpsAddress;
      };
      PaymentDetails: {                     // 👈 required by real UPS API
        ShipmentCharge: [{
          Type: string;
          BillShipper: {
            AccountNumber: string;
          };
        }];
      };
      Service?: { Code: string; Description?: string };
      Package: UpsPackage[];
    };
  };
}

export interface UpsAddress {
  AddressLine: string[];                    // 👈 must be array per real UPS docs
  City: string;
  StateProvinceCode: string;
  PostalCode: string;
  CountryCode: string;
}

export interface UpsPackage {
  PackagingType: { Code: string; Description?: string };
  Dimensions: {
    UnitOfMeasurement: { Code: string; Description?: string };
    Length: string;
    Width: string;
    Height: string;
  };
  PackageWeight: {
    UnitOfMeasurement: { Code: string; Description?: string };
    Weight: string;
  };
}

export interface UpsRateResponse {
  RateResponse: {
    RatedShipment: UpsRatedShipment[];
  };
}

export interface UpsRatedShipment {
  Service: { Code: string };
  TotalCharges: { MonetaryValue: string; CurrencyCode: string };
  TimeInTransit?: {
    ServiceSummary?: {
      EstimatedArrival?: {
        BusinessDaysInTransit: string;
      };
    };
  };
}