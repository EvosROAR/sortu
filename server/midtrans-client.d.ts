declare module 'midtrans-client' {
  export class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey?: string });
    createTransaction(parameter: Record<string, unknown>): Promise<{ token: string }>;
  }

  export class CoreApi {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey?: string });
    transaction: {
      notification(payload: unknown): Promise<Record<string, unknown>>;
    };
  }
}
