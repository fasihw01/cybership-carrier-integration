import {
  CarrierOperation,
  CarrierOperationId,
} from "./carrierAdaptor";

export class OperationRegistry {
  private operations = new Map<CarrierOperationId, CarrierOperation<unknown, unknown>>();

  register<I, O>(operation: CarrierOperation<I, O>): void {
    this.operations.set(operation.id, operation as CarrierOperation<unknown, unknown>);
  }

  get<I, O>(operationId: CarrierOperationId): CarrierOperation<I, O> {
    const op = this.operations.get(operationId);
    if (!op) {
      throw new Error(`No operation registered: ${operationId}`);
    }
    return op as CarrierOperation<I, O>;
  }
}

