import { Address, Package, RateRequest, RateQuote } from '../../domain/models';
import { UpsAddress, UpsPackage, UpsRateRequest, UpsRatedShipment } from './ups.types';
import { config } from '../../config/config';

const SERVICE_NAMES: Record<string, string> = {
  '01': 'UPS Next Day Air',
  '02': 'UPS 2nd Day Air',
  '03': 'UPS Ground',
  '12': 'UPS 3 Day Select',
  '13': 'UPS Next Day Air Saver',
  '59': 'UPS 2nd Day Air AM',
  '07': 'UPS Worldwide Express',
  '08': 'UPS Worldwide Expedited',
  '11': 'UPS Standard',
  '54': 'UPS Worldwide Express Plus',
  '65': 'UPS Worldwide Saver',
};

function toUpsAddress(address: Address): UpsAddress {
  return {
    AddressLine: [address.street],          // 👈 now an array per real UPS docs
    City: address.city,
    StateProvinceCode: address.stateCode,
    PostalCode: address.postalCode,
    CountryCode: address.countryCode,
  };
}

function toUpsPackage(pkg: Package): UpsPackage {
  return {
    PackagingType: { Code: '02', Description: 'Packaging' },
    Dimensions: {
      UnitOfMeasurement: { Code: 'IN', Description: 'Inches' },
      Length: String(pkg.lengthIn),
      Width: String(pkg.widthIn),
      Height: String(pkg.heightIn),
    },
    PackageWeight: {
      UnitOfMeasurement: { Code: 'LBS', Description: 'Pounds' },
      Weight: String(pkg.weightLbs),
    },
  };
}

export function toUpsRateRequest(request: RateRequest): UpsRateRequest {
  return {
    RateRequest: {
      Request: {
        RequestOption: request.serviceCode ? 'Rate' : 'Shop',
      },
      Shipment: {
        Shipper: {
          Name: request.origin.name,
          ShipperNumber: config.ups.accountNumber,
          Address: toUpsAddress(request.origin),
        },
        ShipTo: {
          Name: request.destination.name,
          Address: toUpsAddress(request.destination),
        },
        ShipFrom: {
          Name: request.origin.name,
          Address: toUpsAddress(request.origin),
        },
        PaymentDetails: {                   // 👈 added — required by real UPS API
          ShipmentCharge: [{
            Type: '01',
            BillShipper: {
              AccountNumber: config.ups.accountNumber,
            },
          }],
        },
        ...(request.serviceCode && {
          Service: { Code: request.serviceCode, Description: SERVICE_NAMES[request.serviceCode] },
        }),
        Package: request.packages.map(toUpsPackage),
      },
    },
  };
}

export function fromUpsRatedShipment(shipment: UpsRatedShipment): RateQuote {
  const serviceCode = shipment.Service.Code;
  const days = shipment.TimeInTransit
    ?.ServiceSummary?.EstimatedArrival?.BusinessDaysInTransit;

  return {
    carrier: 'UPS',
    serviceCode,
    serviceName: SERVICE_NAMES[serviceCode] ?? `UPS Service ${serviceCode}`,
    totalChargeUsd: parseFloat(shipment.TotalCharges.MonetaryValue),
    currencyCode: shipment.TotalCharges.CurrencyCode,
    estimatedDays: days ? parseInt(days, 10) : undefined,
  };
}