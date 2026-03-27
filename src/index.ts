import { CarrierRegistry } from "./registry/carrierRegistry";
import { UpsCarrierAdapter } from "./carriers/ups/UpsCarrierAdaptor";
import { UpsAuthProvider } from "./carriers/ups/UpsAuthProvider";


const registry = new CarrierRegistry();
registry.register(new UpsCarrierAdapter(new UpsAuthProvider()));

export { registry };
export type { RateRequest, RateQuote, Address, Package } from "./domain/models";
export { CarrierError } from "./domain/errors";
