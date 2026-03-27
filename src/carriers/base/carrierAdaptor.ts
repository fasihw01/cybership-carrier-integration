/**
 * Carrier operations are pluggable. Adding a new carrier operation should not
 * require modifying existing adapters — only registering a new operation.
 */

export type CarrierOperationId = string;

export interface CarrierOperation<I, O> {
  readonly id: CarrierOperationId;
  execute(input: I): Promise<O>;
}

// Every carrier (UPS, FedEx, DHL) must implement this contract.
export interface CarrierAdapter {
  readonly carrierId: string;

  /**
   * Execute a carrier operation by id (e.g. "rates.shop", "labels.purchase").
   */
  execute<I, O>(operationId: CarrierOperationId, input: I): Promise<O>;
}
