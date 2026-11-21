import { db } from "@/lib/db";
import { getReport } from "@/lib/report";
import { blindOrder } from "@/lib/decision";
import {
  addModel,
  addProvider,
  addSuite,
  addCase,
  addComparison,
  importOutput,
} from "./actions";
import { RatingForm } from "@/components/RatingForm";
import { ScoreChart } from "@/components/ScoreChart";
import Image from "next/image";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ comparison?: string }>;
}) {
  const [models, suites, comparisons, jobs] = await Promise.all([
    db.model.findMany({
      include: { providers: true },
      orderBy: { createdAt: "desc" },
    }),
    db.suite.findMany({
      include: { cases: true },
      orderBy: { createdAt: "desc" },
    }),
    db.comparison.findMany({
      include: {
        suite: true,
        outputs: { include: { model: true, provider: true, testCase: true } },
        ratings: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.job.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const query = await searchParams;
  const selected =
    comparisons.find((c) => c.id === query.comparison) ?? comparisons[0];
  const report = selected ? await getReport(selected.id) : null;
  let pair:
    | [(typeof selected.outputs)[number], (typeof selected.outputs)[number]]
    | null = null;
  if (selected) {
    for (const a of selected.outputs.filter(
      (o) => o.modelId === selected.baselineId,
    )) {
      const b = selected.outputs.find(
        (o) =>
          o.modelId === selected.challengerId &&
          o.caseId === a.caseId &&
          !selected.ratings.some(
            (r) =>
              (r.leftId === a.id && r.rightId === o.id) ||
              (r.leftId === o.id && r.rightId === a.id),
          ),
      );
      if (b) {
        pair = blindOrder(a, b);
        break;
      }
    }
  }
  return (
    <div
      className="layout"
      style={{ maxWidth: 1320, margin: "auto", padding: "24px 30px 80px" }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "center",
          borderBottom: "1px solid #304359",
          paddingBottom: 22,
        }}
      >
        <div>
          <div className="pill">OPEN SOURCE · LOCAL FIRST</div>
          <h1 style={{ fontSize: 34, margin: "9px 0 3px" }}>ModelSwap Lab</h1>
          <div className="muted">
            Know whether your next AI model upgrade is actually better before
            shipping it.
          </div>
        </div>
        <nav className="nav">
          <a href="#overview">Overview</a>
          <a href="#models">Models & Providers</a>
          <a href="#suites">Benchmark Suites</a>
          <a href="#comparisons">New Comparison</a>
          <a href="#imports">Import</a>
          <a href="#evaluation">Blind Evaluation</a>
          <a href="#results">Results</a>
          <a href="#jobs">Jobs</a>
          <a href="#settings">Settings</a>
        </nav>
      </header>
      <section id="overview" className="section">
        <h2>Overview</h2>
        <div className="grid3">
          <div className="card">
            <div className="muted">Registered models</div>
            <div className="metric">{models.length}</div>
          </div>
          <div className="card">
            <div className="muted">Benchmark suites</div>
            <div className="metric">{suites.length}</div>
          </div>
          <div className="card">
            <div className="muted">Comparisons</div>
            <div className="metric">{comparisons.length}</div>
          </div>
        </div>
        <p className="muted">
          Start by registering two models and a suite. Import images from each
          model for the same test case, then review them blind.
        </p>
      </section>
      <section id="models" className="section">
        <h2>Models & Providers</h2>
        <div className="grid2">
          <div className="card">
            <h3>Register model</h3>
            <form action={addModel}>
              <label>
                Model name
                <input name="name" required placeholder="Image Model" />
              </label>
              <label>
                Version
                <input name="version" required placeholder="v1" />
              </label>
              <label>
                Capabilities
                <input name="capabilities" defaultValue="text-to-image" />
              </label>
              <label>
                Provider name
                <input name="provider" required defaultValue="Manual import" />
              </label>
              <label>
                Provider type
                <select name="kind">
                  <option value="manual">Manual import</option>
                  <option value="wavespeed">WaveSpeedAI</option>
                </select>
              </label>
              <label>
                Provider model ID (hosted only)
                <input name="providerModelId" />
              </label>
              <label>
                Estimated cost per image
                <input name="price" type="number" min="0" step="any" />
              </label>
              <label>
                <input type="checkbox" name="referenceSupport" /> Supports
                reference image
              </label>
              <button>Register model</button>
            </form>
          </div>
          <div className="card">
            <h3>Registered models</h3>
            {models.length ? (
              models.map((m) => (
                <div
                  key={m.id}
                  style={{
                    borderBottom: "1px solid #304359",
                    padding: "9px 0",
                  }}
                >
                  <strong>
                    {m.name} <span className="muted">{m.version}</span>
                  </strong>
                  <div className="muted">
                    {m.capabilities} · {m.active ? "Active" : "Inactive"}
                  </div>
                  {m.providers.map((p) => (
                    <div key={p.id} className="pill">
                      {p.name} · {p.kind}
                      {p.providerModelId ? ` · ${p.providerModelId}` : ""}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="muted">No models yet.</p>
            )}
            <h3>Add provider to model</h3>
            <form action={addProvider}>
              <label>
                Model
                <select name="modelId" required>
                  {models.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name} {m.version}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Provider name
                <input name="name" required />
              </label>
              <label>
                Type
                <select name="kind">
                  <option value="manual">Manual import</option>
                  <option value="wavespeed">WaveSpeedAI</option>
                </select>
              </label>
              <label>
                Provider model ID
                <input name="providerModelId" />
              </label>
              <label>
                Default parameters (JSON)
                <textarea name="parameters" defaultValue="{}" />
              </label>
              <label>
                Estimated cost per image
                <input name="price" type="number" min="0" step="any" />
              </label>
              <label>
                <input type="checkbox" name="referenceSupport" /> Supports
                reference image
              </label>
              <button disabled={!models.length}>Add provider</button>
            </form>
          </div>
        </div>
      </section>
      <section id="suites" className="section">
        <h2>Benchmark Suites</h2>
        <div className="grid2">
          <div className="card">
            <h3>Create suite</h3>
            <form action={addSuite}>
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Description
                <textarea name="description" />
              </label>
              <button>Create suite</button>
            </form>
            <h3>Add test case</h3>
            <form action={addCase}>
              <label>
                Suite
                <select name="suiteId" required>
                  {suites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prompt
                <textarea name="prompt" required />
              </label>
              <label>
                Negative prompt
                <input name="negativePrompt" />
              </label>
              <label>
                Reference image
                <input
                  type="file"
                  name="reference"
                  accept="image/png,image/jpeg,image/webp"
                />
              </label>
              <label>
                Criteria (comma separated)
                <input
                  name="criteria"
                  placeholder="identity, anatomy, lighting"
                />
              </label>
              <label>
                Expected capabilities
                <input name="capabilities" defaultValue="text-to-image" />
              </label>
              <label>
                Parameters (JSON)
                <textarea name="parameters" defaultValue="{}" />
              </label>
              <button disabled={!suites.length}>Add case</button>
            </form>
          </div>
          <div className="card">
            <h3>Available suites</h3>
            {suites.length ? (
              suites.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: "9px 0",
                    borderBottom: "1px solid #304359",
                  }}
                >
                  <strong>{s.name}</strong>{" "}
                  {s.demo && (
                    <span className="pill">Synthetic demo prompts</span>
                  )}
                  <div className="muted">
                    {s.description} · {s.cases.length} cases
                  </div>
                  <details>
                    <summary>View prompts</summary>
                    <ol>
                      {s.cases.map((c) => (
                        <li key={c.id}>{c.prompt}</li>
                      ))}
                    </ol>
                  </details>
                </div>
              ))
            ) : (
              <p className="muted">
                No suites yet. Run the demo seed command to add 20 synthetic
                prompts.
              </p>
            )}
          </div>
        </div>
      </section>
      <section id="comparisons" className="section">
        <h2>New Comparison</h2>
        <div className="grid2">
          <div className="card">
            <form action={addComparison}>
              <label>
                Name
                <input
                  name="name"
                  required
                  placeholder="Baseline vs challenger"
                />
              </label>
              <label>
                Benchmark suite
                <select name="suiteId" required>
                  {suites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Baseline model
                <select name="baselineId" required>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.version}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Challenger model
                <select
                  name="challengerId"
                  required
                  defaultValue={models[1]?.id}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.version}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid3">
                <label>
                  Minimum decisive pairs
                  <input
                    name="minPairs"
                    type="number"
                    min="1"
                    defaultValue="5"
                  />
                </label>
                <label>
                  Minimum win rate
                  <input
                    name="minWinRate"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    defaultValue="0.55"
                  />
                </label>
                <label>
                  Maximum cost ratio
                  <input
                    name="maxCostRatio"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="1.2"
                  />
                </label>
              </div>
              <button disabled={models.length < 2 || !suites.length}>
                Create comparison
              </button>
            </form>
          </div>
          <div className="card">
            <h3>Select comparison</h3>
            {comparisons.length ? (
              comparisons.map((c) => (
                <p key={c.id}>
                  <a href={`/?comparison=${c.id}#results`}>{c.name}</a>{" "}
                  <span className="muted">
                    · {c.outputs.length} images · {c.ratings.length} ratings
                  </span>
                </p>
              ))
            ) : (
              <p className="muted">No comparisons yet.</p>
            )}
          </div>
        </div>
      </section>
      <section id="imports" className="section">
        <h2>Manual image import</h2>
        <div className="grid2">
          <div className="card">
            {selected ? (
              <form action={importOutput}>
                <input type="hidden" name="comparisonId" value={selected.id} />
                <p className="muted">
                  Importing into {selected.name}. Uploads stay on this machine.
                </p>
                <label>
                  Test case
                  <select name="caseId" required>
                    {suites
                      .find((s) => s.id === selected.suiteId)
                      ?.cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.prompt.slice(0, 95)}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Model
                  <select name="modelId" required>
                    {models
                      .filter((m) =>
                        [selected.baselineId, selected.challengerId].includes(
                          m.id,
                        ),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.version}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Provider
                  <select name="providerId" required>
                    {models
                      .filter((m) =>
                        [selected.baselineId, selected.challengerId].includes(
                          m.id,
                        ),
                      )
                      .flatMap((m) =>
                        m.providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {m.name} · {p.name}
                          </option>
                        )),
                      )}
                  </select>
                </label>
                <label>
                  Generated image
                  <input
                    type="file"
                    name="image"
                    required
                    accept="image/png,image/jpeg,image/webp"
                  />
                </label>
                <label>
                  Reference image, if used
                  <input
                    type="file"
                    name="reference"
                    accept="image/png,image/jpeg,image/webp"
                  />
                </label>
                <label>
                  Prompt override (optional)
                  <textarea name="prompt" />
                </label>
                <div className="grid2">
                  <label>
                    Seed
                    <input name="seed" />
                  </label>
                  <label>
                    Resolution
                    <input name="resolution" placeholder="1024x1024" />
                  </label>
                  <label>
                    Generation duration (ms)
                    <input type="number" name="durationMs" min="0" />
                  </label>
                  <label>
                    Cost per image
                    <input type="number" name="cost" min="0" step="any" />
                  </label>
                </div>
                <label>
                  <input type="checkbox" name="actualCost" /> Cost is actual,
                  not estimated
                </label>
                <label>
                  Generation parameters (JSON)
                  <textarea name="parameters" defaultValue="{}" />
                </label>
                <label>
                  Additional metadata (JSON)
                  <textarea name="metadata" defaultValue="{}" />
                </label>
                <button>Import image</button>
              </form>
            ) : (
              <p className="muted">Create a comparison first.</p>
            )}
          </div>
          <div className="card">
            <h3>Imported images</h3>
            {selected?.outputs.length ? (
              selected.outputs.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "8px 0",
                  }}
                >
                  <Image
                    unoptimized
                    width={70}
                    height={70}
                    src={o.imagePath}
                    alt="Imported generation"
                    style={{
                      width: 70,
                      height: 70,
                      objectFit: "cover",
                      borderRadius: 7,
                    }}
                  />
                  <div>
                    <strong>{o.model.name}</strong>
                    <div className="muted">
                      {o.testCase.prompt.slice(0, 75)}
                    </div>
                    <small className="muted">
                      {o.provider.name} ·{" "}
                      {o.durationMs === null
                        ? "Latency missing"
                        : `${o.durationMs} ms`}{" "}
                      · {o.cost === null ? "Cost missing" : `${o.cost}`}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">
                No images imported. Add at least one image from each model for
                the same case.
              </p>
            )}
          </div>
        </div>
      </section>
      <section id="evaluation" className="section">
        <h2>Blind Evaluation</h2>
        <div className="card">
          {pair && selected ? (
            <>
              <p className="muted">
                Model identities are hidden until you submit a rating. Compare
                outputs for the same prompt.
              </p>
              <p>
                <strong>Prompt:</strong> {pair[0].prompt}
              </p>
              <div className="images">
                {pair.map((o, i) => (
                  <div key={o.id}>
                    <div className="pill">Image {i === 0 ? "A" : "B"}</div>
                    <Image
                      unoptimized
                      width={600}
                      height={400}
                      src={o.imagePath}
                      alt={`Blind comparison image ${i === 0 ? "A" : "B"}`}
                    />
                  </div>
                ))}
              </div>
              <RatingForm
                comparisonId={selected.id}
                leftId={pair[0].id}
                rightId={pair[1].id}
              />
            </>
          ) : (
            <p className="muted">
              No unrated pairs. Import an image from each model for the same
              case, or review the revealed identities below.
            </p>
          )}
          {selected?.ratings.length ? (
            <details style={{ marginTop: 20 }}>
              <summary>Submitted ratings · reveal model identities</summary>
              {selected.ratings.map((r) => (
                <p key={r.id}>
                  A:{" "}
                  {selected.outputs.find((o) => o.id === r.leftId)?.model.name}{" "}
                  · B:{" "}
                  {selected.outputs.find((o) => o.id === r.rightId)?.model.name}{" "}
                  · Preference: {r.winner} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              ))}
            </details>
          ) : null}
        </div>
      </section>
      <section id="results" className="section">
        <h2>Decision Report</h2>
        {report ? (
          <div className="card">
            <div className="pill">PRIVATE · LOCAL</div>
            <h3 style={{ fontSize: 25 }}>{report.comparison.name}</h3>
            <p>
              <strong>{report.summary.recommendation}</strong>{" "}
              <span className="muted">
                · {report.summary.total} blind ratings across {report.coverage}/
                {report.comparison.suite.cases.length} cases
              </span>
            </p>
            <div className="grid3">
              <div>
                <div className="muted">Challenger win rate</div>
                <div className="metric">
                  {report.summary.winRate === null
                    ? "Missing"
                    : `${Math.round(report.summary.winRate * 100)}%`}
                </div>
              </div>
              <div>
                <div className="muted">Baseline</div>
                <strong>
                  {report.baseline.name} {report.baseline.version}
                </strong>
              </div>
              <div>
                <div className="muted">Challenger</div>
                <strong>
                  {report.challenger.name} {report.challenger.version}
                </strong>
              </div>
            </div>
            <ScoreChart
              identity={report.summary.identity}
              quality={report.summary.quality}
              adherence={report.summary.adherence}
            />
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Baseline</th>
                    <th>Challenger</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["Character identity", report.summary.identity],
                      ["Visual quality", report.summary.quality],
                      ["Prompt adherence", report.summary.adherence],
                      ["Mean latency (ms)", report.summary.latency],
                      ["Mean cost", report.summary.cost],
                    ] as const
                  ).map(([name, values]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>
                        {values.baseline === null
                          ? "Missing"
                          : values.baseline.toFixed(2)}
                      </td>
                      <td>
                        {values.challenger === null
                          ? "Missing"
                          : values.challenger.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Decision requires {report.comparison.minPairs} decisive ratings, ≥
              {Math.round(report.comparison.minWinRate * 100)}% challenger wins,
              and ≤{report.comparison.maxCostRatio}× baseline cost when both are
              known. Small samples are uncertain. Failure rate is unavailable
              for manual imports.
            </p>
            <div className="nav">
              <a
                className="button"
                href={`/api/export/${selected!.id}?format=md`}
              >
                Export Markdown
              </a>
              <a
                className="button"
                href={`/api/export/${selected!.id}?format=csv`}
              >
                Export CSV
              </a>
            </div>
            <h3>Example images</h3>
            <div className="images">
              {[report.baselineOutputs[0], report.challengerOutputs[0]].map(
                (o, i) =>
                  o ? (
                    <div key={o.id}>
                      <div className="muted">
                        {i === 0 ? "Baseline" : "Challenger"} ·{" "}
                        {o.provider.name}
                      </div>
                      <Image
                        unoptimized
                        width={600}
                        height={400}
                        src={o.imagePath}
                        alt={
                          i === 0 ? "Baseline example" : "Challenger example"
                        }
                      />
                    </div>
                  ) : (
                    <div key={i} className="muted">
                      No image yet
                    </div>
                  ),
              )}
            </div>
          </div>
        ) : (
          <div className="card muted">
            Create a comparison to view a report.
          </div>
        )}
      </section>
      <section id="jobs" className="section">
        <h2>Jobs</h2>
        <div className="card">
          {jobs.length ? (
            jobs.map((j) => (
              <p key={j.id}>
                {j.state} · {j.id} · {j.attempts} attempts
              </p>
            ))
          ) : (
            <p className="muted">
              No hosted jobs. Manual imports are available without API
              credentials; hosted generation requires explicit action and a
              configured provider.
            </p>
          )}
        </div>
      </section>
      <section id="settings" className="section">
        <h2>Settings</h2>
        <div className="card muted">
          Local data is private by default. Thresholds are configured when
          creating a comparison. Hosted API keys stay server-side.
        </div>
      </section>
    </div>
  );
}
