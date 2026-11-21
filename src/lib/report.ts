import { db } from "./db";
import { summarize, type Sample } from "./decision";
export async function getReport(id: string) {
  const comparison = await db.comparison.findUnique({
    where: { id },
    include: {
      suite: { include: { cases: true } },
      outputs: { include: { model: true, provider: true, testCase: true } },
      ratings: { include: { left: true, right: true } },
    },
  });
  if (!comparison) return null;
  const models = await db.model.findMany({
    where: { id: { in: [comparison.baselineId, comparison.challengerId] } },
  });
  const baseline = models.find((m) => m.id === comparison.baselineId)!;
  const challenger = models.find((m) => m.id === comparison.challengerId)!;
  const samples: Sample[] = comparison.ratings.map((r) => {
    const flip = r.left.modelId !== baseline.id;
    const value = (l: number | null, rr: number | null) =>
      flip ? [rr, l] : [l, rr];
    const [baselineIdentity, challengerIdentity] = value(
      r.leftIdentity,
      r.rightIdentity,
    );
    const [baselineQuality, challengerQuality] = value(
      r.leftQuality,
      r.rightQuality,
    );
    const [baselineAdherence, challengerAdherence] = value(
      r.leftAdherence,
      r.rightAdherence,
    );
    return {
      winner:
        r.winner === "tie"
          ? "tie"
          : (r.winner === "left") === !flip
            ? "baseline"
            : "challenger",
      baselineIdentity,
      challengerIdentity,
      baselineQuality,
      challengerQuality,
      baselineAdherence,
      challengerAdherence,
    };
  });
  const b = comparison.outputs.filter((o) => o.modelId === baseline.id),
    c = comparison.outputs.filter((o) => o.modelId === challenger.id);
  const summary = summarize(
    samples,
    b.map((o) => ({ durationMs: o.durationMs, cost: o.cost })),
    c.map((o) => ({ durationMs: o.durationMs, cost: o.cost })),
    comparison,
  );
  return {
    comparison,
    baseline,
    challenger,
    summary,
    coverage: new Set(comparison.ratings.map((r) => r.left.caseId)).size,
    baselineOutputs: b,
    challengerOutputs: c,
  };
}
export function reportMarkdown(
  r: NonNullable<Awaited<ReturnType<typeof getReport>>>,
) {
  const { comparison, baseline, challenger, summary: s } = r;
  const fmt = (n: number | null, unit = "") =>
    n === null ? "Missing" : `${n.toFixed(2)}${unit}`;
  return `# ${comparison.name}\n\n**Recommendation: ${s.recommendation}**\n\nBaseline: ${baseline.name} ${baseline.version}\nChallenger: ${challenger.name} ${challenger.version}\nSuite: ${comparison.suite.name} (${comparison.suite.cases.length} cases)\nCases reviewed: ${r.coverage}\nBlind ratings: ${s.total}; decisive: ${s.decisive}\n\n| Metric | Baseline | Challenger |\n|---|---:|---:|\n| Preference wins | ${s.decisive - s.wins} | ${s.wins} |\n| Character identity (1–5) | ${fmt(s.identity.baseline)} | ${fmt(s.identity.challenger)} |\n| Visual quality (1–5) | ${fmt(s.quality.baseline)} | ${fmt(s.quality.challenger)} |\n| Prompt adherence (1–5) | ${fmt(s.adherence.baseline)} | ${fmt(s.adherence.challenger)} |\n| Mean latency | ${fmt(s.latency.baseline, " ms")} | ${fmt(s.latency.challenger, " ms")} |\n| Mean cost per imported image | ${fmt(s.cost.baseline)} | ${fmt(s.cost.challenger)} |\n\nChallenger win rate: ${fmt(s.winRate === null ? null : s.winRate * 100, "%")}\n\nDecision rules: at least ${comparison.minPairs} decisive ratings; challenger win rate at least ${comparison.minWinRate * 100}%; challenger cost at most ${comparison.maxCostRatio}× baseline when both costs are known.\n\nLimitations: Small or unbalanced samples may be misleading. Manual imports do not measure generation failure rate. Missing values are excluded from means. Ratings are human judgments, not statistical significance tests.\n`;
}
