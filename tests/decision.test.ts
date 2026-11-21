import { describe, it, expect } from "vitest";
import { blindOrder, mean, summarize } from "../src/lib/decision";
describe("decision rules", () => {
  it("preserves missing data", () => {
    expect(mean([null, null])).toBeNull();
    expect(mean([0, null, 2])).toBe(1);
  });
  it("randomizes either side", () => {
    expect(blindOrder("a", "b", () => 0)).toEqual(["a", "b"]);
    expect(blindOrder("a", "b", () => 1)).toEqual(["b", "a"]);
  });
  it("requires evidence", () => {
    expect(summarize([], [], []).recommendation).toBe("Collect more evidence");
  });
  it("counts decisive wins and respects cost ceiling", () => {
    const s = Array.from({ length: 5 }, () => ({
      winner: "challenger" as const,
      baselineIdentity: 3,
      challengerIdentity: 4,
      baselineQuality: 3,
      challengerQuality: 4,
      baselineAdherence: 3,
      challengerAdherence: 4,
    }));
    expect(
      summarize(
        s,
        [{ durationMs: 100, cost: 1 }],
        [{ durationMs: 80, cost: 1.1 }],
      ).recommendation,
    ).toBe("Consider switching");
    expect(
      summarize(
        s,
        [{ durationMs: 100, cost: 1 }],
        [{ durationMs: 80, cost: 2 }],
      ).recommendation,
    ).toBe("Retain baseline");
  });
});
