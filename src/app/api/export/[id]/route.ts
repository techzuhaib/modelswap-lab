import { getReport, reportMarkdown } from "@/lib/report";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getReport((await params).id);
  if (!r) return new Response("Not found", { status: 404 });
  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv") {
    const quote = (s: unknown) => `"${String(s ?? "").replaceAll('"', '""')}"`;
    const headers = [
      "record_type",
      "case_id",
      "prompt",
      "model_or_a",
      "provider_or_b",
      "image_or_a",
      "image_b",
      "duration_ms",
      "cost",
      "cost_type",
      "winner",
      "identity_a",
      "identity_b",
      "quality_a",
      "quality_b",
      "adherence_a",
      "adherence_b",
      "notes",
    ];
    const rows = [
      headers,
      ...r.comparison.outputs.map((o) => [
        "output",
        o.testCase.id,
        o.prompt,
        o.model.name,
        o.provider.name,
        o.imagePath,
        "",
        o.durationMs,
        o.cost,
        o.cost === null ? "missing" : o.actualCost ? "actual" : "estimated",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]),
      ...r.comparison.ratings.map((rating) => {
        const a = r.comparison.outputs.find((o) => o.id === rating.leftId)!,
          b = r.comparison.outputs.find((o) => o.id === rating.rightId)!;
        return [
          "rating",
          a.caseId,
          a.prompt,
          a.model.name,
          b.model.name,
          a.imagePath,
          b.imagePath,
          "",
          "",
          "",
          rating.winner,
          rating.leftIdentity,
          rating.rightIdentity,
          rating.leftQuality,
          rating.rightQuality,
          rating.leftAdherence,
          rating.rightAdherence,
          rating.notes,
        ];
      }),
    ];
    return new Response(
      rows.map((row) => row.map(quote).join(",")).join("\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="modelswap-results.csv"',
        },
      },
    );
  }
  return new Response(reportMarkdown(r), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelswap-report.md"',
    },
  });
}
