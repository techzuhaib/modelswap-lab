"use server";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const num = (form: FormData, key: string) => {
  const v = text(form, key);
  return v === "" ? null : Number(v);
};
const optional = (v: string) => v || null;
const json = (v: string) => {
  if (!v) return "{}";
  const parsed = JSON.parse(v);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
    throw Error("Parameters must be a JSON object");
  return JSON.stringify(parsed);
};
async function image(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || !file.size) return null;
  if (file.size > 10 * 1024 * 1024) throw Error("Image must be at most 10 MB");
  const bytes = Buffer.from(await file.arrayBuffer());
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!png && !jpg && !webp)
    throw Error("Only PNG, JPEG, or WebP images are accepted");
  const name = `${randomUUID()}.${png ? "png" : jpg ? "jpg" : "webp"}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes, { flag: "wx" });
  return `/uploads/${name}`;
}
export async function addModel(f: FormData) {
  const data = z
    .object({
      name: z.string().min(2),
      version: z.string().min(1),
      provider: z.string().min(1),
      kind: z.enum(["manual", "wavespeed"]),
      providerModelId: z.string(),
      capabilities: z.string(),
      price: z.string(),
    })
    .parse(
      Object.fromEntries(
        [
          "name",
          "version",
          "provider",
          "kind",
          "providerModelId",
          "capabilities",
          "price",
        ].map((k) => [k, text(f, k)]),
      ),
    );
  await db.model.create({
    data: {
      name: data.name,
      version: data.version,
      capabilities: data.capabilities || "text-to-image",
      providers: {
        create: {
          name: data.provider,
          kind: data.kind,
          providerModelId: optional(data.providerModelId),
          pricePerImage: data.price ? Number(data.price) : null,
          referenceSupport: f.get("referenceSupport") === "on",
        },
      },
    },
  });
  revalidatePath("/");
}
export async function addProvider(f: FormData) {
  const modelId = text(f, "modelId");
  await db.providerConfig.create({
    data: {
      modelId,
      name: z.string().min(1).parse(text(f, "name")),
      kind: z.enum(["manual", "wavespeed"]).parse(text(f, "kind")),
      providerModelId: optional(text(f, "providerModelId")),
      pricePerImage: num(f, "price"),
      parameters: json(text(f, "parameters")),
      referenceSupport: f.get("referenceSupport") === "on",
    },
  });
  revalidatePath("/");
}
export async function addSuite(f: FormData) {
  await db.suite.create({
    data: {
      name: z.string().min(2).parse(text(f, "name")),
      description: text(f, "description"),
    },
  });
  revalidatePath("/");
}
export async function addCase(f: FormData) {
  const referencePath = await image(f.get("reference"));
  await db.testCase.create({
    data: {
      suiteId: text(f, "suiteId"),
      prompt: z.string().min(3).parse(text(f, "prompt")),
      negativePrompt: optional(text(f, "negativePrompt")),
      referencePath,
      criteria: JSON.stringify(
        text(f, "criteria")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
      parameters: json(text(f, "parameters")),
      expectedCapabilities: JSON.stringify(
        text(f, "capabilities")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    },
  });
  revalidatePath("/");
}
export async function addComparison(f: FormData) {
  const baselineId = text(f, "baselineId"),
    challengerId = text(f, "challengerId");
  if (baselineId === challengerId) throw Error("Select different models");
  const created = await db.comparison.create({
    data: {
      name: z.string().min(2).parse(text(f, "name")),
      suiteId: text(f, "suiteId"),
      baselineId,
      challengerId,
      minPairs: Number(text(f, "minPairs") || 5),
      minWinRate: Number(text(f, "minWinRate") || 0.55),
      maxCostRatio: Number(text(f, "maxCostRatio") || 1.2),
    },
  });
  redirect(`/?comparison=${created.id}`);
}
export async function importOutput(f: FormData) {
  const comparisonId = text(f, "comparisonId"),
    caseId = text(f, "caseId"),
    modelId = text(f, "modelId"),
    providerId = text(f, "providerId");
  const comparison = await db.comparison.findUniqueOrThrow({
    where: { id: comparisonId },
  });
  const testCase = await db.testCase.findUniqueOrThrow({
    where: { id: caseId },
  });
  const provider = await db.providerConfig.findUniqueOrThrow({
    where: { id: providerId },
  });
  if (
    testCase.suiteId !== comparison.suiteId ||
    ![comparison.baselineId, comparison.challengerId].includes(modelId) ||
    provider.modelId !== modelId
  )
    throw Error(
      "Selected model, provider, and case must belong to this comparison",
    );
  const imagePath = await image(f.get("image"));
  if (!imagePath) throw Error("Image required");
  const referencePath = await image(f.get("reference"));
  const durationMs = num(f, "durationMs"),
    cost = num(f, "cost");
  if (durationMs !== null && (!Number.isFinite(durationMs) || durationMs < 0))
    throw Error("Invalid duration");
  if (cost !== null && (!Number.isFinite(cost) || cost < 0))
    throw Error("Invalid cost");
  await db.output.create({
    data: {
      comparisonId,
      caseId,
      modelId,
      providerId,
      imagePath,
      referencePath,
      prompt: text(f, "prompt") || testCase.prompt,
      seed: optional(text(f, "seed")),
      resolution: optional(text(f, "resolution")),
      parameters: json(text(f, "parameters")),
      metadata: json(text(f, "metadata")),
      durationMs,
      cost,
      actualCost: f.get("actualCost") === "on",
    },
  });
  revalidatePath("/");
}
export async function addRating(f: FormData) {
  const leftId = text(f, "leftId"),
    rightId = text(f, "rightId"),
    comparisonId = text(f, "comparisonId");
  const [left, right] = await Promise.all([
    db.output.findUniqueOrThrow({ where: { id: leftId } }),
    db.output.findUniqueOrThrow({ where: { id: rightId } }),
  ]);
  const comparison = await db.comparison.findUniqueOrThrow({
    where: { id: comparisonId },
  });
  if (
    left.comparisonId !== comparisonId ||
    right.comparisonId !== comparisonId ||
    left.caseId !== right.caseId ||
    left.modelId === right.modelId ||
    ![comparison.baselineId, comparison.challengerId].includes(left.modelId) ||
    ![comparison.baselineId, comparison.challengerId].includes(right.modelId)
  )
    throw Error("Invalid blind pair");
  const score = (k: string) => {
    const n = Number(text(f, k));
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
  };
  await db.rating.create({
    data: {
      comparisonId,
      leftId,
      rightId,
      winner: z.enum(["left", "right", "tie"]).parse(text(f, "winner")),
      leftIdentity: score("leftIdentity"),
      rightIdentity: score("rightIdentity"),
      leftQuality: score("leftQuality"),
      rightQuality: score("rightQuality"),
      leftAdherence: score("leftAdherence"),
      rightAdherence: score("rightAdherence"),
      notes: text(f, "notes").slice(0, 2000),
    },
  });
  revalidatePath("/");
}
