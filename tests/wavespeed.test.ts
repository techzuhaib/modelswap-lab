import { describe, it, expect, vi } from "vitest";
import { WaveSpeedAdapter } from "../src/lib/providers/wavespeed";
const response = (data: object) =>
  new Response(JSON.stringify({ code: 200, message: "success", data }), {
    status: 200,
  });
describe("WaveSpeed contract", () => {
  it("validates model identity and prompt", () => {
    const a = new WaveSpeedAdapter("test", vi.fn() as unknown as typeof fetch);
    expect(() =>
      a.validate({ modelId: "../x", prompt: "hi", parameters: {} }),
    ).toThrow();
    expect(() =>
      a.validate({ modelId: "vendor/model", prompt: "", parameters: {} }),
    ).toThrow();
  });
  it("submits documented endpoint and polls results", async () => {
    const http = vi
      .fn()
      .mockResolvedValueOnce(response({ id: "pred_abc", status: "created" }))
      .mockResolvedValueOnce(
        response({
          id: "pred_abc",
          status: "completed",
          outputs: ["https://example.test/image.png"],
          timings: { inference: 2500 },
        }),
      );
    const a = new WaveSpeedAdapter("test", http);
    expect(
      (
        await a.submit({
          modelId: "vendor/model",
          prompt: "cat",
          parameters: { size: "1024*1024" },
        })
      ).status,
    ).toBe("queued");
    expect(http.mock.calls[0][0]).toBe(
      "https://api.wavespeed.ai/api/v3/vendor/model",
    );
    expect(JSON.parse(http.mock.calls[0][1].body)).toEqual({
      size: "1024*1024",
      prompt: "cat",
    });
    expect((await a.poll("pred_abc")).inferenceMs).toBe(2500);
    expect(http.mock.calls[1][0]).toBe(
      "https://api.wavespeed.ai/api/v3/predictions/pred_abc/result",
    );
  });
});
