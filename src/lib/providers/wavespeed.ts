import type {
  GenerationRequest,
  GenerationResult,
  ProviderAdapter,
} from "./types";
type Payload = {
  code: number;
  message: string;
  data: {
    id: string;
    status: string;
    outputs?: string[];
    error?: string;
    timings?: { inference?: number };
  };
};
export class WaveSpeedAdapter implements ProviderAdapter {
  readonly kind = "wavespeed";
  constructor(
    private key: string,
    private http: typeof fetch = fetch,
  ) {
    if (!key) throw Error("WAVESPEED_API_KEY is required");
  }
  validate(r: GenerationRequest) {
    if (!/^[a-z0-9-]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(r.modelId))
      throw Error("Invalid WaveSpeed model ID");
    if (!r.prompt.trim()) throw Error("Prompt required");
    if (r.referenceImage && !/^https:\/\//.test(r.referenceImage))
      throw Error("WaveSpeed reference images require an HTTPS URL");
  }
  private normalize(p: Payload): GenerationResult {
    const d = p.data;
    const status: GenerationResult["status"] =
      d.status === "completed"
        ? "completed"
        : d.status === "failed" ||
            d.status === "timeout" ||
            d.status === "deleted"
          ? "failed"
          : d.status === "cancelled"
            ? "cancelled"
            : d.status === "processing"
              ? "running"
              : "queued";
    return {
      id: d.id,
      status,
      outputs: d.outputs ?? [],
      error: d.error || undefined,
      inferenceMs: d.timings?.inference,
    };
  }
  private async request(url: string, init: RequestInit) {
    const res = await this.http(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw Error(`WaveSpeed HTTP ${res.status}`);
    const body = (await res.json()) as Payload;
    if (body.code !== 200 || !body.data?.id)
      throw Error(`WaveSpeed response error: ${body.message}`);
    return this.normalize(body);
  }
  async submit(r: GenerationRequest) {
    this.validate(r);
    const body = {
      ...r.parameters,
      prompt: r.prompt,
      ...(r.referenceImage ? { image: r.referenceImage } : {}),
    };
    return this.request(`https://api.wavespeed.ai/api/v3/${r.modelId}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  async poll(id: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw Error("Invalid prediction ID");
    return this.request(
      `https://api.wavespeed.ai/api/v3/predictions/${id}/result`,
      { method: "GET" },
    );
  }
}
