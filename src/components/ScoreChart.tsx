"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
type Pair = { baseline: number | null; challenger: number | null };
export function ScoreChart({
  identity,
  quality,
  adherence,
}: {
  identity: Pair;
  quality: Pair;
  adherence: Pair;
}) {
  const data = [
    {
      metric: "Identity",
      Baseline: identity.baseline,
      Challenger: identity.challenger,
    },
    {
      metric: "Quality",
      Baseline: quality.baseline,
      Challenger: quality.challenger,
    },
    {
      metric: "Adherence",
      Baseline: adherence.baseline,
      Challenger: adherence.challenger,
    },
  ];
  if (data.every((x) => x.Baseline === null && x.Challenger === null))
    return null;
  return (
    <div
      style={{ height: 245, marginTop: 20 }}
      role="img"
      aria-label="Human rating comparison chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="metric" stroke="#9cafc7" />
          <YAxis domain={[0, 5]} stroke="#9cafc7" />
          <Tooltip />
          <Legend />
          <Bar dataKey="Baseline" fill="#7c9fc7" />
          <Bar dataKey="Challenger" fill="#49d7bd" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
