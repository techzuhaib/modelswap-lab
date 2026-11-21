export type GenerationRequest = {
  modelId: string;
  prompt: string;
  referenceImage?: string;
  parameters: Record<string, unknown>;
};
export type GenerationResult = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  outputs: string[];
  error?: string;
  inferenceMs?: number;
  cost?: number;
};
export interface ProviderAdapter {
  readonly kind: string;
  validate(request: GenerationRequest): void;
  submit(request: GenerationRequest): Promise<GenerationResult>;
  poll(id: string): Promise<GenerationResult>;
  cancel?(id: string): Promise<void>;
}
