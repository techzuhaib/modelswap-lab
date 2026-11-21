export type Sample = {
  winner: "baseline" | "challenger" | "tie";
  baselineIdentity: number | null;
  challengerIdentity: number | null;
  baselineQuality: number | null;
  challengerQuality: number | null;
  baselineAdherence: number | null;
  challengerAdherence: number | null;
};
export type Measurement = { durationMs: number | null; cost: number | null };
export function mean(values: (number | null)[]) {
  const found = values.filter((x): x is number => x !== null);
  return found.length ? found.reduce((a, b) => a + b, 0) / found.length : null;
}
export function summarize(
  samples: Sample[],
  baseline: Measurement[],
  challenger: Measurement[],
  settings = { minPairs: 5, minWinRate: 0.55, maxCostRatio: 1.2 },
) {
  const decisive = samples.filter((s) => s.winner !== "tie");
  const wins = decisive.filter((s) => s.winner === "challenger").length;
  const winRate = decisive.length ? wins / decisive.length : null;
  const quality = {
    baseline: mean(samples.map((s) => s.baselineQuality)),
    challenger: mean(samples.map((s) => s.challengerQuality)),
  };
  const identity = {
    baseline: mean(samples.map((s) => s.baselineIdentity)),
    challenger: mean(samples.map((s) => s.challengerIdentity)),
  };
  const adherence = {
    baseline: mean(samples.map((s) => s.baselineAdherence)),
    challenger: mean(samples.map((s) => s.challengerAdherence)),
  };
  const latency = {
    baseline: mean(baseline.map((x) => x.durationMs)),
    challenger: mean(challenger.map((x) => x.durationMs)),
  };
  const cost = {
    baseline: mean(baseline.map((x) => x.cost)),
    challenger: mean(challenger.map((x) => x.cost)),
  };
  let recommendation:
    "Consider switching" | "Retain baseline" | "Collect more evidence" =
    "Collect more evidence";
  if (decisive.length >= settings.minPairs && winRate !== null) {
    if (
      winRate >= settings.minWinRate &&
      (cost.baseline === null ||
        cost.challenger === null ||
        (cost.baseline === 0
          ? cost.challenger === 0
          : cost.challenger / cost.baseline <= settings.maxCostRatio))
    )
      recommendation = "Consider switching";
    else recommendation = "Retain baseline";
  }
  return {
    recommendation,
    winRate,
    wins,
    decisive: decisive.length,
    total: samples.length,
    quality,
    identity,
    adherence,
    latency,
    cost,
  };
}
export function blindOrder<T>(a: T, b: T, random = Math.random): [T, T] {
  return random() < 0.5 ? [a, b] : [b, a];
}
