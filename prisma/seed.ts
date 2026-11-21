import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const prompts = [
  "Photorealistic portrait of an adult with freckles in soft window light, natural skin texture",
  "Anime character portrait with crisp line art and a detailed city background",
  "Same adult character with short red hair and green jacket, front view",
  "Same adult character with short red hair and green jacket, profile view",
  "Same adult character with short red hair and green jacket, three-quarter view",
  "Full-body adult character walking through a park, anatomically plausible hands",
  "Adult character seated at a cafe table, natural arm placement",
  "Portrait of an adult under dramatic blue stage lighting",
  "Portrait of an adult at golden hour outdoors",
  "Adult character in a raincoat against a rainy street, consistent face",
  "Adult character in formal attire against a plain studio backdrop",
  "Anime character jumping, dynamic pose and coherent limbs",
  "Photorealistic portrait with shallow depth of field and accurate eyes",
  "Adult character photographed from a low camera angle",
  "Adult character photographed from a high camera angle",
  "Adult character in a kitchen, complex background objects",
  "Adult character holding a red umbrella with exactly five visible fingers",
  "Two adult characters standing side by side without merged anatomy",
  "A yellow bicycle beside a blue door, exact colors and composition",
  "Adult character in winter clothing in a snowy landscape, consistent identity",
];
async function main() {
  if (await db.suite.count({ where: { demo: true } })) return;
  await db.suite.create({
    data: {
      name: "Synthetic image evaluation starter",
      description:
        "20 synthetic prompts for manual model comparisons. No generated images or scores are included.",
      demo: true,
      cases: {
        create: prompts.map((prompt) => ({
          prompt,
          criteria: JSON.stringify([
            "visual quality",
            "prompt adherence",
            "anatomy",
            "identity when applicable",
          ]),
          expectedCapabilities: JSON.stringify(["text-to-image"]),
        })),
      },
    },
  });
}
main().finally(() => db.$disconnect());
