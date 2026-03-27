import { CarrierAdapter } from "../carriers/base/carrierAdaptor";

// To add FedEx: registry.register(new FedExCarrierAdapter(...))
// Nothing else changes anywhere in the codebase.
export class CarrierRegistry {
  private adapters = new Map<string, CarrierAdapter>();

  register(adapter: CarrierAdapter): void {
    this.adapters.set(adapter.carrierId.toUpperCase(), adapter);
  }

  get(carrierId: string): CarrierAdapter {
    const adapter = this.adapters.get(carrierId.toUpperCase());
    if (!adapter) {
      throw new Error(`No adapter registered for carrier: ${carrierId}`);
    }
    return adapter;
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}
