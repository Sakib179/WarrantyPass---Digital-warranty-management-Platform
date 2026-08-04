export interface DatabaseHealthPort {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  checkHealth(): Promise<number>;
}
