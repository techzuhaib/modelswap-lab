import { db } from "./db";
import type { ProviderAdapter, GenerationRequest } from "./providers/types";
// The runner only handles already approved jobs. Submission POST is never retried automatically.
export async function enqueue(
  providerId: string,
  idempotencyKey: string,
  request: GenerationRequest,
) {
  return db.job.upsert({
    where: { idempotencyKey },
    update: {},
    create: { providerId, idempotencyKey, request: JSON.stringify(request) },
  });
}
export async function runJob(id: string, adapter: ProviderAdapter) {
  const job = await db.job.findUniqueOrThrow({ where: { id } });
  if (["completed", "failed", "cancelled"].includes(job.state)) return job;
  const now = new Date();
  if (job.startedAt && now.getTime() - job.startedAt.getTime() > job.timeoutMs)
    return db.job.update({
      where: { id },
      data: { state: "failed", error: "Local timeout", finishedAt: now },
    });
  if (job.state === "queued") {
    await db.job.update({
      where: { id },
      data: { state: "running", startedAt: now, attempts: { increment: 1 } },
    });
    try {
      const result = await adapter.submit(
        JSON.parse(job.request) as GenerationRequest,
      );
      return db.job.update({
        where: { id },
        data: {
          externalId: result.id,
          state: result.status,
          result: JSON.stringify(result),
          finishedAt: ["completed", "failed", "cancelled"].includes(
            result.status,
          )
            ? new Date()
            : null,
        },
      });
    } catch (e) {
      return db.job.update({
        where: { id },
        data: {
          state: "failed",
          error: e instanceof Error ? e.message : "Submission failed",
          finishedAt: new Date(),
        },
      });
    }
  }
  if (!job.externalId) throw Error("Running job has no external ID");
  try {
    const result = await adapter.poll(job.externalId);
    return db.job.update({
      where: { id },
      data: {
        state: result.status,
        result: JSON.stringify(result),
        finishedAt: ["completed", "failed", "cancelled"].includes(result.status)
          ? new Date()
          : null,
      },
    });
  } catch (e) {
    if (job.attempts >= job.maxAttempts)
      return db.job.update({
        where: { id },
        data: {
          state: "failed",
          error: e instanceof Error ? e.message : "Polling failed",
          finishedAt: new Date(),
        },
      });
    return db.job.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        error: e instanceof Error ? e.message : "Temporary polling error",
      },
    });
  }
}
