# ModelSwap Lab

Know whether your next AI image model upgrade is actually better before shipping it.

ModelSwap Lab is a local-first, open-source developer tool for controlled image-model comparisons. Register baseline and challenger models separately from their inference providers, create reusable benchmark suites, import generated images, rate them blind, and export an evidence-backed replacement report. Manual imports require no API key or paid service.

## Local setup

Requires Node.js 20+, npm, and SQLite (managed by Prisma). The development server binds to localhost only.

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Uploaded images and `prisma/dev.db` stay local and are ignored by Git. The demo seed creates 20 synthetic prompts, no images or fabricated scores.

## Workflow

1. Register two model versions and at least one provider for each.
2. Create a suite or use the synthetic starter suite.
3. Create a comparison and set its minimum sample, win-rate, and cost thresholds.
4. Import PNG, JPEG, or WebP generations (up to 10 MB) for the same test case and each model. Record duration and cost if known.
5. Submit blind preferences and 1–5 ratings. Reveal identities only after submitting.
6. Review the private decision report and export Markdown or CSV.

Multiple images per model and case are allowed. Missing measurements are shown as missing, not zero.

## WaveSpeedAI

The typed adapter in `src/lib/providers/wavespeed.ts` implements the documented [submission](https://wavespeed.ai/docs/submit-task) and [result polling](https://wavespeed.ai/docs/get-result) endpoints. Set `WAVESPEED_API_KEY` server-side if developing hosted generation. Configure a complete model ID from the [WaveSpeed model docs](https://wavespeed.ai/docs/docs-api) and model-specific JSON parameters. Reference images must be externally accessible HTTPS URLs in the field expected by that model; the Z-Image Base model documents an `image` parameter. No live requests were made, and the app does not expose a paid-generation button yet. The adapter has mocked HTTP tests only. No pricing is hard-coded.

## Tests

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Architecture and contribution

See [ARCHITECTURE.md](ARCHITECTURE.md) for schema, decision rules, and provider extension guidance. Contributions are welcome through issues and pull requests. Keep provider-specific request schemas and pricing documented, add mocked contract tests, and never commit credentials or proprietary data. Apache 2.0 license is preserved in `LICENSE`.

## Limitations and roadmap

This MVP is single-user and local. Manual imports do not provide a failure-rate denominator. Hosted job execution is a service-layer extension and is not wired to a paid UI action. Reports are private and have no share links. Next milestones: explicit hosted execution controls with local job scheduling, failure-rate tracking, better pairing across multiple generations, and optional reviewer accounts.
